import type { TabId } from './components/Header'


export const WORKSPACE_TABS: TabId[] = ['overview', 'auth', 'webhooks', 'sync', 'analytics', 'devops']


export function parseWorkspaceState(search: string): { tab: TabId; projectId: string | null; repositoryId: number | null } {
  const params = new URLSearchParams(search)
  const requestedTab = params.get('tab') as TabId | 'ai' | null
  const projectId = params.get('project')
  const repositoryId = Number(params.get('repo'))
  return {
    tab: requestedTab === 'ai' ? 'analytics' : requestedTab && WORKSPACE_TABS.includes(requestedTab) ? requestedTab : 'overview',
    projectId: projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)
      ? projectId
      : null,
    repositoryId: Number.isSafeInteger(repositoryId) && repositoryId > 0 ? repositoryId : null,
  }
}


export function buildWorkspaceUrl(tab: TabId, projectId?: string | null, repositoryId?: number | null): string {
  const params = new URLSearchParams({ tab })
  if (projectId) params.set('project', projectId)
  if (repositoryId) params.set('repo', String(repositoryId))
  return `/app?${params.toString()}`
}
