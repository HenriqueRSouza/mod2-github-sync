import type { PlatformProject } from './api'

export interface PlatformUser {
  id: string
  email: string
  display_name: string
  is_active: boolean
  created_at: string
}

export interface PlatformSession {
  accessToken: string
  tokenType: 'bearer'
  expiresAt: number
  user: PlatformUser
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const SESSION_KEY = 'github-sync.platform-session.v1'
const PROJECTS_CACHE_PREFIX = 'github-sync.platform-projects.v1'
const PROJECTS_CACHE_MAX_AGE_MS = 5 * 60 * 1000

export interface PlatformSessionStores {
  tab: StorageLike | null
  device: StorageLike | null
}

function browserSessionStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function browserLocalStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function browserSessionStores(): PlatformSessionStores {
  return { tab: browserSessionStorage(), device: browserLocalStorage() }
}

function projectsCacheKey(userId: string): string {
  return `${PROJECTS_CACHE_PREFIX}.${userId}`
}

function preferredStore(stores: PlatformSessionStores): StorageLike | null {
  // A lista acompanha a opção de permanência da sessão: localStorage somente
  // quando o usuário marcou "Lembrar de mim"; caso contrário, fecha com a aba.
  return stores.device?.getItem(SESSION_KEY) ? stores.device : stores.tab
}

interface CachedPlatformProjects {
  cachedAt: number
  items: PlatformProject[]
}

export function createPlatformSession(
  accessToken: string,
  expiresInSeconds: number,
  user: PlatformUser,
  now = Date.now(),
): PlatformSession {
  return {
    accessToken,
    tokenType: 'bearer',
    expiresAt: now + Math.max(0, expiresInSeconds) * 1000,
    user,
  }
}

export function isSessionExpired(session: PlatformSession, now = Date.now()): boolean {
  // A pequena margem evita iniciar uma requisição com um token prestes a vencer.
  return session.expiresAt <= now + 5_000
}

export function savePlatformSession(
  session: PlatformSession,
  rememberOnDevice = false,
  stores = browserSessionStores(),
): void {
  const serialized = JSON.stringify(session)
  if (rememberOnDevice) {
    stores.device?.setItem(SESSION_KEY, serialized)
    stores.tab?.removeItem(SESSION_KEY)
  } else {
    stores.tab?.setItem(SESSION_KEY, serialized)
    stores.device?.removeItem(SESSION_KEY)
  }
}

export function clearPlatformSession(stores = browserSessionStores()): void {
  stores.tab?.removeItem(SESSION_KEY)
  stores.device?.removeItem(SESSION_KEY)
}

export function savePlatformProjectsCache(
  userId: string,
  items: PlatformProject[],
  now = Date.now(),
  stores = browserSessionStores(),
): void {
  if (!userId) return
  preferredStore(stores)?.setItem(projectsCacheKey(userId), JSON.stringify({ cachedAt: now, items }))
}

export function readPlatformProjectsCache(
  userId: string,
  now = Date.now(),
  stores = browserSessionStores(),
): PlatformProject[] | null {
  if (!userId) return null
  const key = projectsCacheKey(userId)
  for (const storage of [stores.tab, stores.device]) {
    const serialized = storage?.getItem(key)
    if (!serialized) continue
    try {
      const cache = JSON.parse(serialized) as Partial<CachedPlatformProjects>
      const valid =
        typeof cache.cachedAt === 'number' &&
        now - cache.cachedAt <= PROJECTS_CACHE_MAX_AGE_MS &&
        Array.isArray(cache.items)
      if (!valid) {
        storage?.removeItem(key)
        continue
      }
      return cache.items as PlatformProject[]
    } catch {
      storage?.removeItem(key)
    }
  }
  return null
}

export function clearPlatformProjectsCache(userId: string, stores = browserSessionStores()): void {
  if (!userId) return
  const key = projectsCacheKey(userId)
  stores.tab?.removeItem(key)
  stores.device?.removeItem(key)
}

export function readPlatformSession(
  stores = browserSessionStores(),
  now = Date.now(),
): PlatformSession | null {
  for (const storage of [stores.tab, stores.device]) {
    const serialized = storage?.getItem(SESSION_KEY)
    if (!serialized) continue

    try {
      const session = JSON.parse(serialized) as Partial<PlatformSession>
      const valid =
        typeof session.accessToken === 'string' &&
        session.accessToken.length > 0 &&
        session.tokenType === 'bearer' &&
        typeof session.expiresAt === 'number' &&
        typeof session.user?.id === 'string' &&
        typeof session.user?.email === 'string'

      if (!valid || isSessionExpired(session as PlatformSession, now)) {
        storage?.removeItem(SESSION_KEY)
        continue
      }
      return session as PlatformSession
    } catch {
      storage?.removeItem(SESSION_KEY)
    }
  }
  return null
}

export function sessionRemainingSeconds(session: PlatformSession, now = Date.now()): number {
  return Math.max(0, Math.ceil((session.expiresAt - now) / 1000))
}

export function authorizationHeader(session: PlatformSession | null): Record<string, string> {
  if (!session || isSessionExpired(session)) return {}
  return { Authorization: `Bearer ${session.accessToken}` }
}
