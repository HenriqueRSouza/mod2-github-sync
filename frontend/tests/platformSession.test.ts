import assert from 'node:assert/strict'
import test from 'node:test'

import {
  authorizationHeader,
  clearPlatformSession,
  clearPlatformProjectsCache,
  createPlatformSession,
  isSessionExpired,
  readPlatformProjectsCache,
  readPlatformSession,
  savePlatformProjectsCache,
  savePlatformSession,
  sessionRemainingSeconds,
  type PlatformSessionStores,
  type StorageLike,
} from '../src/platformSession.ts'

function memoryStorage(): StorageLike {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function memoryStores(): PlatformSessionStores {
  return { tab: memoryStorage(), device: memoryStorage() }
}

const user = {
  id: '46d493f0-40c7-4f92-b13c-330dde429779',
  email: 'aluno@example.com',
  display_name: 'Aluno',
  is_active: true,
  created_at: '2026-10-22T12:00:00Z',
}

test('session uses expires_in and can be restored only before expiration', () => {
  const stores = memoryStores()
  const session = createPlatformSession('signed-token', 1800, user, 1_000)
  savePlatformSession(session, false, stores)

  assert.equal(session.expiresAt, 1_801_000)
  assert.equal(readPlatformSession(stores, 60_000)?.accessToken, 'signed-token')
  assert.equal(sessionRemainingSeconds(session, 1_000), 1800)
  assert.equal(isSessionExpired(session, 1_796_001), true)
  assert.equal(readPlatformSession(stores, 1_801_000), null)
})

test('remember me persists in device storage and survives a new tab', () => {
  const stores = memoryStores()
  const session = createPlatformSession('remembered-token', 1800, user, 1_000)
  savePlatformSession(session, true, stores)

  const reopenedBrowser = { tab: memoryStorage(), device: stores.device }
  assert.equal(readPlatformSession(reopenedBrowser, 60_000)?.accessToken, 'remembered-token')
  assert.equal(stores.tab?.getItem('github-sync.platform-session.v1'), null)
})

test('tab-only login removes a previously remembered session', () => {
  const stores = memoryStores()
  savePlatformSession(createPlatformSession('remembered-token', 1800, user), true, stores)
  savePlatformSession(createPlatformSession('tab-token', 1800, user), false, stores)

  assert.equal(readPlatformSession(stores)?.accessToken, 'tab-token')
  assert.equal(stores.device?.getItem('github-sync.platform-session.v1'), null)
})

test('authorization is omitted for missing or expired sessions', () => {
  const session = createPlatformSession('signed-token', 1800, user, 1_000)
  assert.deepEqual(authorizationHeader(session), {})

  const currentSession = createPlatformSession('signed-token', 1800, user)
  assert.deepEqual(authorizationHeader(currentSession), { Authorization: 'Bearer signed-token' })
})

test('invalid persisted content is discarded and logout clears storage', () => {
  const stores = memoryStores()
  stores.device?.setItem('github-sync.platform-session.v1', '{invalid')
  assert.equal(readPlatformSession(stores), null)

  const session = createPlatformSession('signed-token', 1800, user)
  savePlatformSession(session, true, stores)
  clearPlatformSession(stores)
  assert.equal(readPlatformSession(stores), null)
})

test('project cache restores a recent list in the same session storage scope', () => {
  const stores = memoryStores()
  savePlatformSession(createPlatformSession('tab-token', 1800, user, 1_000), false, stores)
  savePlatformProjectsCache(user.id, [{
    id: 'project-1',
    owner_id: user.id,
    name: 'Projeto rápido',
    description: '',
    created_at: '2026-10-22T12:00:00Z',
  }], 1_000, stores)

  assert.equal(readPlatformProjectsCache(user.id, 2_000, stores)?.[0]?.name, 'Projeto rápido')
  assert.equal(readPlatformProjectsCache(user.id, 302_000, stores), null)
})

test('project cache is cleared with the selected account on logout', () => {
  const stores = memoryStores()
  savePlatformProjectsCache(user.id, [], 1_000, stores)
  clearPlatformProjectsCache(user.id, stores)
  assert.equal(readPlatformProjectsCache(user.id, 2_000, stores), null)
})
