import assert from 'node:assert/strict'
import test from 'node:test'

import { api } from '../src/api.ts'

test('login uses the same-origin proxy without attaching a stale bearer token', async () => {
  const originalFetch = globalThis.fetch
  let captured: { input?: string; init?: RequestInit } = {}
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init }
    return new Response(JSON.stringify({ access_token: 'new-token', token_type: 'bearer', expires_in: 1800 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    api.setAccessToken('stale-token')
    const result = await api.platformLogin('aluno@example.com', 'password-with-12-chars')
    const headers = new Headers(captured.init?.headers)
    assert.equal(captured.input, '/api/v1/platform/auth/token')
    assert.equal(captured.init?.method, 'POST')
    assert.equal(headers.get('Authorization'), null)
    assert.equal(headers.get('Content-Type'), 'application/json')
    assert.deepEqual(JSON.parse(String(captured.init?.body)), {
      email: 'aluno@example.com',
      password: 'password-with-12-chars',
    })
    assert.equal(result.expires_in, 1800)
  } finally {
    api.setAccessToken(null)
    globalThis.fetch = originalFetch
  }
})

test('authenticated calls carry bearer and repository listing propagates project_id', async () => {
  const originalFetch = globalThis.fetch
  let captured: { input?: string; init?: RequestInit } = {}
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init }
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    api.setAccessToken('signed-token')
    await api.repositories('46d493f0-40c7-4f92-b13c-330dde429779')
    const headers = new Headers(captured.init?.headers)
    assert.equal(
      captured.input,
      '/api/v1/repositories?project_id=46d493f0-40c7-4f92-b13c-330dde429779',
    )
    assert.equal(headers.get('Authorization'), 'Bearer signed-token')
    assert.equal(captured.init?.credentials, 'omit')
  } finally {
    api.setAccessToken(null)
    globalThis.fetch = originalFetch
  }
})

test('GitHub webhook or sync 401 does not expire the platform session', async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const fakeWindow = new EventTarget()
  let expiredEvents = 0
  fakeWindow.addEventListener('platform-session-expired', () => { expiredEvents += 1 })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow })
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'O GitHub recusou o token informado.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

  try {
    api.setAccessToken('platform-token')
    assert.equal((await api.sendWebhook('{}', { 'X-GitHub-Event': 'push' })).status, 401)
    assert.equal((await api.syncRepository(42, 'invalid-github-token')).status, 401)
    assert.equal(expiredEvents, 0)
  } finally {
    api.setAccessToken(null)
    globalThis.fetch = originalFetch
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
