import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError } from '../src/api.ts'
import { platformAccessErrorMessage } from '../src/platformErrors.ts'

test('login credentials error is localized before using the upstream detail', () => {
  const error = new ApiError(401, { detail: 'Invalid credentials' })
  assert.equal(platformAccessErrorMessage(error, 'login'), 'E-mail ou senha inválidos.')
})

test('common authentication failures never expose raw upstream English messages', () => {
  assert.equal(
    platformAccessErrorMessage(new ApiError(429, { detail: 'Too many requests' }), 'login'),
    'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.',
  )
  assert.equal(
    platformAccessErrorMessage(new ApiError(503, { detail: 'Service unavailable' }), 'login'),
    'O serviço de autenticação está iniciando. Tente novamente em alguns segundos.',
  )
})
