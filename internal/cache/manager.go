// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package cache

import (
	"sync"
	"sync/atomic"

	"podnest/internal/logger"
)

// Manager owns every site's response cache store and settings
type Manager struct {
	mu       sync.Mutex
	settings atomic.Pointer[map[int64]Settings] // siteID → parsed settings; swapped whole so no request sees a half-built set
	stores   sync.Map                           // int64(siteID) → *Store; created on first use
	def      Settings
}

// NewManager returns a Manager seeded with empty settings so lookups never see nil
func NewManager() *Manager {
	m := &Manager{}
	m.def, _ = ParseSettings(nil)
	empty := make(map[int64]Settings)
	m.settings.Store(&empty)
	return m
}

// Settings returns a site's settings, falling back to the defaults for a site with none
func (m *Manager) Settings(siteID int64) Settings {
	if s, ok := (*m.settings.Load())[siteID]; ok {
		return s
	}
	return m.def
}

// Store returns a site's store, creating it on first use
func (m *Manager) Store(siteID int64) *Store {
	if v, ok := m.stores.Load(siteID); ok {
		return v.(*Store)
	}
	v, _ := m.stores.LoadOrStore(siteID, newStore())
	return v.(*Store)
}

// Purge drops every cached response for a site
func (m *Manager) Purge(siteID int64) {
	if v, ok := m.stores.Load(siteID); ok {
		v.(*Store).Purge()
	}
}

// Refresh installs the settings for every site from the raw config maps. Existing
// stores are kept untouched unless their site is now disabled (purged), has a
// lower memory cap (shrunk) or no longer exists (removed).
func (m *Manager) Refresh(all map[int64]map[string]string) {
	next := make(map[int64]Settings, len(all))
	for id, kv := range all {
		s, err := ParseSettings(kv)
		if err != nil {
			logger.Warn("cache: invalid proxy cache config for site %d — using defaults: %v", id, err)
			s = m.def
		}
		next[id] = s
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	m.settings.Store(&next)

	m.stores.Range(func(k, v any) bool {
		s, ok := next[k.(int64)]
		if !ok {
			m.stores.Delete(k)
			return true
		}
		apply(v.(*Store), s)
		return true
	})
}

// Update installs one site's settings from its raw config map and applies them to
// the site's store, returning an error when the config is invalid
func (m *Manager) Update(siteID int64, kv map[string]string) error {
	s, err := ParseSettings(kv)
	if err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	cur := *m.settings.Load()
	next := make(map[int64]Settings, len(cur)+1)
	for k, v := range cur {
		next[k] = v
	}
	next[siteID] = s
	m.settings.Store(&next)

	if v, ok := m.stores.Load(siteID); ok {
		apply(v.(*Store), s)
	}
	return nil
}

// apply purges a disabled site's store and shrinks an enabled one to its memory cap
func apply(st *Store, s Settings) {
	if !s.Enabled {
		st.Purge()
		return
	}
	st.Resize(s.Memory)
}
