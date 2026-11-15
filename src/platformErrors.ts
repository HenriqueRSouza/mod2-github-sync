export type PlatformAccessOperation = 'login' | 'register'

interface HttpErrorLike {
  status: number
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
}

export function platformAccessErrorMessage(
  error: unknown,
  operation: PlatformAccessOperation,
): string {
  if (!isHttpErrorLike(error)) {
    return 'Não foi possível concluir a solicitação. Verifique a conexão e tente novamente.'
  }

  if (error.status === 401) return 'E-mail ou senha inválidos.'
  if (error.status === 409 && operation === 'register') return 'Já existe uma conta cadastrada com este e-mail.'
  if (error.status === 422) return 'Revise os dados informados e tente novamente.'
  if (error.status === 429) return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.'
  if (error.status === 503 || error.status === 504) {
    return 'O serviço de autenticação está iniciando. Tente novamente em alguns segundos.'
  }

  return operation === 'register'
    ? 'Não foi possível criar sua conta. Tente novamente.'
    : 'Não foi possível entrar. Verifique a conexão e tente novamente.'
}
