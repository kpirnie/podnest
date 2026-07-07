// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os"
	"podnest/internal/logger"
	"time"
)

// ObtainCert proactively triggers Let's Encrypt certificate issuance for a domain.
func (p *Proxy) ObtainCert(domain string) {
	go func() {
		logger.Debug("proactively obtaining certificate for domain '%s'", domain)
		hello := &tls.ClientHelloInfo{ServerName: domain}
		if _, err := p.manager.GetCertificate(hello); err != nil {
			logger.Error("failed to obtain certificate for '%s': %v", domain, err)
			return
		}
		logger.Debug("certificate obtained successfully for '%s'", domain)
	}()
}

// probeUpstreamTLS records whether an https upstream presents a verifiable certificate,
// so serving can pick the verifying transport without a per-route setting
func (p *Proxy) probeUpstreamTLS(u *url.URL) {
	if u.Scheme != "https" {
		return
	}
	host := u.Host
	if u.Port() == "" {
		host = net.JoinHostPort(u.Hostname(), "443")
	}
	d := &net.Dialer{Timeout: 5 * time.Second}
	conn, err := tls.DialWithDialer(d, "tcp", host, &tls.Config{ServerName: u.Hostname()})
	if err != nil {
		p.rpTLSVerified.Store(u.Host, false)
		return
	}
	conn.Close()
	p.rpTLSVerified.Store(u.Host, true)
	logger.Debug("proxy: upstream %s presents a verifiable certificate", u.Host)
}

// rpTransportForTarget returns the verifying transport when the upstream's cert probed as valid
func (p *Proxy) rpTransportForTarget(t UpstreamTarget) *http.Transport {
	if v, ok := p.rpTLSVerified.Load(t.URL.Host); ok && v.(bool) {
		return p.rpVerifyTransport
	}
	return p.rpTransport
}

// markTLSUnverified flips a probed-verified host back to skip-verify; returns true if flipped
func (p *Proxy) markTLSUnverified(t UpstreamTarget) bool {
	if v, ok := p.rpTLSVerified.Load(t.URL.Host); ok && v.(bool) {
		p.rpTLSVerified.Store(t.URL.Host, false)
		return true
	}
	return false
}

// selfSignedCert generates or loads a persistent self-signed cert from the cert directory.
func selfSignedCert(certDir string) (tls.Certificate, error) {
	certFile := certDir + "/self-signed.crt"
	keyFile := certDir + "/self-signed.key"

	if _, err := os.Stat(certFile); err == nil {
		return tls.LoadX509KeyPair(certFile, keyFile)
	}

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, err
	}

	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "podnest-self-signed"},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(10 * 365 * 24 * time.Hour),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}

	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, err
	}

	if err := os.MkdirAll(certDir, 0750); err != nil {
		return tls.Certificate{}, err
	}
	cf, _ := os.Create(certFile)
	pem.Encode(cf, &pem.Block{Type: "CERTIFICATE", Bytes: der})
	cf.Close()

	kb, _ := x509.MarshalECPrivateKey(key)
	kf, _ := os.Create(keyFile)
	pem.Encode(kf, &pem.Block{Type: "EC PRIVATE KEY", Bytes: kb})
	kf.Close()

	return tls.LoadX509KeyPair(certFile, keyFile)
}
