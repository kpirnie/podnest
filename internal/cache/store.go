// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cache

import (
	"container/list"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"podnest/internal/models"
)

// Entry is one cached response; chunks are never modified once stored, so a hit
// streams them without holding the store lock
type Entry struct {
	Status  int
	Header  http.Header
	Chunks  [][]byte
	Length  int64
	Expires time.Time
	primary string
	key     string
	size    int64
}

// Store holds one site's cached responses and evicts the least recently used
// entries once the site's memory cap is exceeded
type Store struct {
	mu      sync.Mutex
	entries map[string]*list.Element
	order   *list.List
	vary    map[string][]string
	counts  map[string]int
	used    int64
}

// newStore returns an empty Store
func newStore() *Store {
	return &Store{
		entries: make(map[string]*list.Element),
		order:   list.New(),
		vary:    make(map[string][]string),
		counts:  make(map[string]int),
	}
}

// VaryNames returns the sorted, de-duplicated request header names a response
// varies on (Accept-Encoding is always included), and false when the response
// varies on "*" and must not be cached
func VaryNames(h http.Header) ([]string, bool) {
	set := map[string]struct{}{"Accept-Encoding": {}}
	for _, v := range h.Values("Vary") {
		for _, n := range strings.Split(v, ",") {
			n = strings.TrimSpace(n)
			if n == "*" {
				return nil, false
			}
			if n != "" {
				set[http.CanonicalHeaderKey(n)] = struct{}{}
			}
		}
	}
	names := make([]string, 0, len(set))
	for n := range set {
		names = append(names, n)
	}
	sort.Strings(names)
	return names, true
}

// variantKey appends the request's values for each varied header to the primary key
func variantKey(primary string, names []string, h http.Header) string {
	var b strings.Builder
	b.WriteString(primary)
	for _, n := range names {
		b.WriteByte(0)
		b.WriteString(n)
		b.WriteByte('=')
		b.WriteString(strings.Join(h.Values(n), ","))
	}
	return b.String()
}

// headerSize returns the byte size of a header set for memory accounting
func headerSize(h http.Header) int64 {
	var n int64
	for k, vs := range h {
		n += int64(len(k))
		for _, v := range vs {
			n += int64(len(v))
		}
	}
	return n
}

// Get returns the live entry for a primary key and request, refreshing its
// recency; an expired entry is removed and reported as a miss
func (s *Store) Get(primary string, reqHeader http.Header, now time.Time) (*Entry, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	names, ok := s.vary[primary]
	if !ok {
		return nil, false
	}
	el, ok := s.entries[variantKey(primary, names, reqHeader)]
	if !ok {
		return nil, false
	}
	e := el.Value.(*Entry)
	if !now.Before(e.Expires) {
		s.remove(el)
		return nil, false
	}
	s.order.MoveToFront(el)
	return e, true
}

// Put stores an entry, evicting least recently used entries to stay within max
// bytes; an entry that cannot fit on its own is dropped
func (s *Store) Put(primary string, names []string, reqHeader http.Header, e *Entry, max int64) {
	e.primary = primary
	e.key = variantKey(primary, names, reqHeader)
	e.size = int64(len(e.key)) + e.Length + headerSize(e.Header)
	if e.size > max {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if old, ok := s.entries[e.key]; ok {
		s.remove(old)
	}
	s.evict(max - e.size)
	s.vary[primary] = names
	s.counts[primary]++
	s.entries[e.key] = s.order.PushFront(e)
	s.used += e.size
}

// Resize evicts least recently used entries until the store fits within max bytes
func (s *Store) Resize(max int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evict(max)
}

// Purge drops every entry
func (s *Store) Purge() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries = make(map[string]*list.Element)
	s.order.Init()
	s.vary = make(map[string][]string)
	s.counts = make(map[string]int)
	s.used = 0
}

// evict removes least recently used entries until used is at or below target
func (s *Store) evict(target int64) {
	for s.used > target {
		back := s.order.Back()
		if back == nil {
			return
		}
		s.remove(back)
	}
}

// remove deletes one entry; the caller holds the lock
func (s *Store) remove(el *list.Element) {
	e := s.order.Remove(el).(*Entry)
	delete(s.entries, e.key)
	s.used -= e.size
	if s.counts[e.primary]--; s.counts[e.primary] <= 0 {
		delete(s.counts, e.primary)
		delete(s.vary, e.primary)
	}
}

// Builder accumulates a response body into fixed-size chunks and gives up once
// the body exceeds the largest cacheable object
type Builder struct {
	chunks [][]byte
	cur    []byte
	length int64
	over   bool
}

// Write appends p, returning false once the body is too large to cache
func (b *Builder) Write(p []byte) bool {
	if b.over {
		return false
	}
	if b.length+int64(len(p)) > models.ProxyCacheMaxObject {
		b.over = true
		b.chunks, b.cur = nil, nil
		return false
	}
	b.length += int64(len(p))

	for len(p) > 0 {
		if b.cur == nil {
			b.cur = make([]byte, 0, models.ProxyCacheChunkSize)
		}
		n := models.ProxyCacheChunkSize - len(b.cur)
		if n > len(p) {
			n = len(p)
		}
		b.cur = append(b.cur, p[:n]...)
		p = p[n:]
		if len(b.cur) == models.ProxyCacheChunkSize {
			b.chunks = append(b.chunks, b.cur)
			b.cur = nil
		}
	}
	return true
}

// Chunks returns the accumulated chunks and total length, or false when the
// body overflowed
func (b *Builder) Chunks() ([][]byte, int64, bool) {
	if b.over {
		return nil, 0, false
	}
	chunks := b.chunks
	if len(b.cur) > 0 {
		chunks = append(chunks, append([]byte(nil), b.cur...))
	}
	return chunks, b.length, true
}
