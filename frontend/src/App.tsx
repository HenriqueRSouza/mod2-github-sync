import { useCallback, useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { WorkspaceSidebar } from './components/WorkspaceSidebar'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import type { TabId } from './components/Header'
import { ConnectRepoModal } from './components/ConnectRepoModal'
import { OverviewTab } from './components/tabs/OverviewTab'
import { AuthTab } from './components/tabs/AuthTab'
import { WebhooksTab } from './components/tabs/WebhooksTab'
import { SyncTab } from './components/tabs/SyncTab'
import { IntelligenceTab } from './components/tabs/IntelligenceTab'
import { DevelopmentTab } from './components/tabs/DevelopmentTab'
import { LandingPage } from './components/LandingPage'
import { PlatformAccess } from './components/PlatformAccess'
import { CreateProjectModal } from './components/CreateProjectModal'
import { DisconnectRepositoryModal } from './components/DisconnectRepositoryModal'
import { ProjectHub } from './components/ProjectHub'
import { buildWorkspaceUrl, parseWorkspaceState } from './workspaceState'
import {
  clearPlatformSession,
  clearPlatformProjectsCache,
  isSessionExpired,
  readPlatformProjectsCache,
  readPlatformSession,
  savePlatformProjectsCache,
  savePlatformSession,
  type PlatformSession,
} from './platformSession'
import {
  api,
  ApiError,
  type Branch,
  type Commit,
  type ConnectivityStatus,
  type Delivery,
  type FlowMetrics,
  type PullRequest,
  type PlatformProject,
  type Repository,
} from './api'

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('github-sync-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('github-sync-theme', theme)
  }, [theme])

  const themeControl = (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
      aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
      title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      <span>{theme === 'light' ? 'Tema escuro' : 'Tema claro'}</span>
    </button>
  )

  // A landing é a porta de entrada institucional e /app é o único workspace.
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/legacy')) {
        window.history.replaceState(null, '', '/app')
        return 'workspace'
      }
      if (
        window.location.pathname.startsWith('/app')
      ) return 'workspace'
      return 'landing'
    }
    return 'landing'
  })

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'overview'
    return parseWorkspaceState(window.location.search).tab
  })
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false)
  const [disconnectRepository, setDisconnectRepository] = useState<Repository | null>(null)
  const [disconnectingRepository, setDisconnectingRepository] = useState(false)
  const [platformSession, setPlatformSession] = useState<PlatformSession | null>(() => readPlatformSession())
  const [sessionChecking, setSessionChecking] = useState(false)
  const [accessNotice, setAccessNotice] = useState<string | null>(null)
  const [platformContextLoading, setPlatformContextLoading] = useState(false)
  const [platformContextError, setPlatformContextError] = useState<string | null>(null)
  const [platformContextReload, setPlatformContextReload] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
  const [projects, setProjects] = useState<PlatformProject[]>(() =>
    platformSession ? readPlatformProjectsCache(platformSession.user.id) ?? [] : [],
  )
  const [selectedProject, setSelectedProject] = useState<PlatformProject | null>(null)
  const projectRequestVersion = useRef(0)
  const repositoryRequestVersion = useRef(0)

  // Estados Globais de Repositórios e Backend
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [flow, setFlow] = useState<FlowMetrics | null>(null)
  const [connectivity, setConnectivity] = useState<ConnectivityStatus | null>(null)
  const [repoDataLoading, setRepoDataLoading] = useState(false)
  const [repoDataError, setRepoDataError] = useState<string | null>(null)
  const [repositoryTokens, setRepositoryTokens] = useState<Record<number, string>>({})

  // Status de Sincronização
  const [syncing, setSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)

  // Sincroniza a rota ao usar os botões voltar/avançar do navegador
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/legacy')) window.history.replaceState(null, '', '/app')
      const isWorkspace = window.location.pathname.startsWith('/app')
      setViewMode(isWorkspace ? 'workspace' : 'landing')
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('hashchange', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handlePopState)
    }
  }, [])

  const handleSwitchToWorkspace = () => {
    window.history.pushState(null, '', '/app')
    setViewMode('workspace')
  }

  const handleLogout = useCallback((reason: 'expired' | 'manual' = 'expired') => {
    clearPlatformProjectsCache(platformSession?.user.id ?? '')
    api.setAccessToken(null)
    clearPlatformSession()
    setPlatformSession(null)
    setProjects([])
    setSelectedProject(null)
    setRepositories([])
    setSelectedRepo(null)
    setCommits([])
    setBranches([])
    setPullRequests([])
    setDeliveries([])
    setFlow(null)
    setRepositoryTokens({})
    setPlatformContextError(null)
    setSessionChecking(false)
    setAccessNotice(reason === 'manual' ? 'Sessão encerrada com segurança.' : 'Sua sessão expirou. Entre novamente para continuar.')
  }, [platformSession?.user.id])

  const handleAuthenticated = useCallback((session: PlatformSession, rememberOnDevice: boolean) => {
    api.setAccessToken(session.accessToken)
    savePlatformSession(session, rememberOnDevice)
    setProjects(readPlatformProjectsCache(session.user.id) ?? [])
    setPlatformSession(session)
    setSessionChecking(false)
    setAccessNotice(null)
  }, [])

  useEffect(() => {
    if (!platformSession) {
      api.setAccessToken(null)
      return
    }

    api.setAccessToken(platformSession.accessToken)
    if (isSessionExpired(platformSession)) {
      handleLogout('expired')
      return
    }

    const expired = () => handleLogout('expired')
    const timeout = window.setTimeout(expired, Math.max(0, platformSession.expiresAt - Date.now()))
    window.addEventListener('platform-session-expired', expired)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('platform-session-expired', expired)
    }
  }, [handleLogout, platformSession])

  // Carregar dados iniciais da API Django
  const loadRepoCommitsAndDeliveries = useCallback(async (repoId: number) => {
    const requestVersion = ++repositoryRequestVersion.current
    setRepoDataLoading(true)
    setRepoDataError(null)
    try {
      const [commitsRes, branchesRes, pullRequestsRes, delivRes, flowRes] = await Promise.all([
        api.commits(repoId),
        api.branches(repoId),
        api.pullRequests(repoId),
        api.deliveries(repoId),
        api.flow(repoId),
      ])
      if (requestVersion !== repositoryRequestVersion.current) return
      setCommits(commitsRes.results)
      setBranches(branchesRes.results)
      setPullRequests(pullRequestsRes.results)
      setDeliveries(delivRes)
      setFlow(flowRes)
    } catch (err) {
      if (requestVersion !== repositoryRequestVersion.current) return
      console.error('Erro ao carregar dados do repositório:', err)
      setCommits([])
      setBranches([])
      setPullRequests([])
      setDeliveries([])
      setFlow(null)
      setRepoDataError('Não foi possível carregar os dados indexados deste repositório.')
    } finally {
      if (requestVersion === repositoryRequestVersion.current) setRepoDataLoading(false)
    }
  }, [])

  const loadProjectRepositories = useCallback(async (project: PlatformProject) => {
    const requestVersion = ++projectRequestVersion.current
    setRepoDataError(null)
    try {
      const [cRes, repos] = await Promise.all([
        api.connectivity().catch(() => ({ status: 500, data: null as any })),
        api.repositories(project.id),
      ])

      if (requestVersion !== projectRequestVersion.current) return
      if (cRes.status === 200) setConnectivity(cRes.data)
      setRepositories(repos)

      const routeState = parseWorkspaceState(window.location.search)
      const requestedRepoId = routeState.projectId === project.id ? routeState.repositoryId : null
      const active = repos.find((repository) => repository.id === requestedRepoId) || repos[0] || null
      setSelectedRepo(active)
      if (active) {
        await loadRepoCommitsAndDeliveries(active.id)
      } else {
        setCommits([])
        setBranches([])
        setPullRequests([])
        setDeliveries([])
        setFlow(null)
      }
    } catch (err) {
      if (requestVersion !== projectRequestVersion.current) return
      console.error('Erro ao carregar repositórios do projeto:', err)
      setRepositories([])
      setSelectedRepo(null)
      if (err instanceof ApiError && err.status === 403) {
        setRepoDataError('Seu acesso a este projeto ou aos repositórios foi recusado. Atualize os projetos ou entre novamente.')
      } else {
        setRepoDataError('Não foi possível carregar os repositórios deste projeto. Tente novamente.')
      }
    }
  }, [loadRepoCommitsAndDeliveries])

  const handleSelectProject = useCallback((project: PlatformProject | null) => {
    projectRequestVersion.current += 1
    repositoryRequestVersion.current += 1
    setSelectedProject(project)
    setSelectedRepo(null)
    setRepositories([])
    setCommits([])
    setBranches([])
    setPullRequests([])
    setDeliveries([])
    setFlow(null)
    setConnectivity(null)
    setRepoDataError(null)
    setActiveTab('overview')
  }, [])

  useEffect(() => {
    if (!platformSession) return
    let cancelled = false
    const loadPlatformContext = async () => {
      setPlatformContextLoading(true)
      setPlatformContextError(null)
      try {
        const page = await api.platformProjects()
        if (cancelled) return
        setProjects(page.items)
        savePlatformProjectsCache(platformSession.user.id, page.items)
        const requestedProjectId = parseWorkspaceState(window.location.search).projectId
        setSelectedProject((current) => {
          // Não sobrescreve uma escolha feita no seletor enquanto a lista atualiza.
          if (current) return page.items.find((project) => project.id === current.id) || null
          return page.items.find((project) => project.id === requestedProjectId) || null
        })
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          handleLogout('expired')
          return
        }
        setPlatformContextError('O serviço de projetos do Módulo 1 ainda está iniciando ou indisponível. Sua sessão continua válida; tente carregar os projetos novamente.')
      } finally {
        if (!cancelled) setPlatformContextLoading(false)
      }
    }
    void loadPlatformContext()
    return () => { cancelled = true }
    // A sessão só deve ser revalidada quando o token mudar, não após atualizar os dados do usuário.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [handleLogout, platformContextReload, platformSession?.accessToken])

  useEffect(() => {
    if (selectedProject) void loadProjectRepositories(selectedProject)
  }, [loadProjectRepositories, selectedProject])

  const handleRefreshRepositoryData = useCallback(() => {
    if (selectedRepo) void loadRepoCommitsAndDeliveries(selectedRepo.id)
  }, [loadRepoCommitsAndDeliveries, selectedRepo])

  useEffect(() => {
    if (viewMode !== 'workspace' || sessionChecking || !platformSession) return
    window.history.replaceState(null, '', buildWorkspaceUrl(activeTab, selectedProject?.id, selectedRepo?.id))
  }, [activeTab, platformSession, selectedProject, selectedRepo, sessionChecking, viewMode])

  // Disparo manual de sincronização real via GitHub API
  const handleSyncNow = async () => {
    if (!selectedRepo) {
      setSyncFeedback('Conecte ou selecione um repositório antes de sincronizar.')
      setConnectModalOpen(true)
      return
    }
    setSyncing(true)
    setSyncFeedback('Sincronizando com a API do GitHub...')
    try {
      const { status, data } = await api.syncRepository(selectedRepo.id, repositoryTokens[selectedRepo.id])
      if (status === 200) {
        setSyncFeedback(`Sincronização concluída: ${data.commits_synced} commits processados; branches e PRs reconciliados.`)
        await loadRepoCommitsAndDeliveries(selectedRepo.id)
      } else {
        setSyncFeedback(`Erro: HTTP ${status}`)
      }
    } catch (err: any) {
      setSyncFeedback(`Erro: ${err.message}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncFeedback(null), 4000)
    }
  }

  // Novo repositório conectado via modal
  const handleRepoConnected = async (newRepo: Repository, token?: string) => {
    setRepositories((prev) => {
      const existing = prev.filter((r) => r.id !== newRepo.id)
      return [newRepo, ...existing]
    })
    setSelectedRepo(newRepo)
    if (token) setRepositoryTokens((current) => ({ ...current, [newRepo.id]: token }))
    await loadRepoCommitsAndDeliveries(newRepo.id)
    if (newRepo.initial_sync_status === 'failed') {
      setSyncFeedback(newRepo.initial_sync_detail || 'Repositório conectado, mas a sincronização inicial falhou.')
      setTimeout(() => setSyncFeedback(null), 6000)
    }
  }

  const handleDisconnectRepository = async () => {
    if (!disconnectRepository) return
    setDisconnectingRepository(true)
    try {
      const { status, data } = await api.deleteRepository(disconnectRepository.id)
      if (status !== 204) {
        const detail = (data as { detail?: string } | undefined)?.detail
        throw new Error(detail || 'Não foi possível desvincular o repositório.')
      }
      const removedId = disconnectRepository.id
      setRepositories((current) => current.filter((repository) => repository.id !== removedId))
      setRepositoryTokens((current) => {
        const { [removedId]: _removed, ...remaining } = current
        return remaining
      })
      setSelectedRepo((current) => {
        if (current?.id !== removedId) return current
        return repositories.find((repository) => repository.id !== removedId) || null
      })
      setCommits([])
      setBranches([])
      setPullRequests([])
      setDeliveries([])
      setFlow(null)
      setSyncFeedback('Repositório desvinculado do GitHub Sync. O projeto da plataforma foi preservado.')
      setDisconnectRepository(null)
    } catch (error) {
      setSyncFeedback(error instanceof Error ? error.message : 'Não foi possível desvincular o repositório.')
    } finally {
      setDisconnectingRepository(false)
      window.setTimeout(() => setSyncFeedback(null), 5000)
    }
  }

  if (viewMode === 'landing') {
    return <><LandingPage onEnterWorkspace={handleSwitchToWorkspace} />{themeControl}</>
  }

  if (sessionChecking) {
    return (<>
      <main className="platform-access-page">
        <div className="platform-session-loading" role="status">Validando sua sessão…</div>
      </main>
      {themeControl}
    </>)
  }

  if (!platformSession) {
    return <><PlatformAccess notice={accessNotice} onAuthenticated={handleAuthenticated} onBack={() => {
      window.history.pushState(null, '', '/')
      setViewMode('landing')
    }} />{themeControl}</>
  }

  return (
    <div className={`module-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {themeControl}
      <WorkspaceSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          if (window.matchMedia('(max-width: 760px)').matches) setSidebarCollapsed(true)
        }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        user={platformSession.user}
        projects={projects}
        projectsLoading={platformContextLoading}
        projectsError={Boolean(platformContextError)}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onOpenProjects={() => {
          handleSelectProject(null)
          if (window.matchMedia('(max-width: 760px)').matches) setSidebarCollapsed(true)
        }}
        onOpenCreateProject={() => setCreateProjectModalOpen(true)}
        onLogout={() => handleLogout('manual')}
      />

      {/* Área de Conteúdo Principal */}
      <main className="module-main">
        <WorkspaceHeader
          activeTab={activeTab}
          repositories={repositories}
          selectedProject={selectedProject}
          selectedRepo={selectedRepo}
          onSelectRepo={(r) => {
            setSelectedRepo(r)
            loadRepoCommitsAndDeliveries(r.id)
          }}
          onOpenConnectModal={() => setConnectModalOpen(true)}
          onSyncNow={handleSyncNow}
          syncing={syncing}
          connectivity={connectivity}
        />

        {platformContextLoading && projects.length === 0 && (
          <section className="platform-context-notice" role="status">
            <span className="context-loading-dot" />
            <div><strong>Carregando seus projetos em segundo plano</strong><p>Você já pode navegar pelo módulo enquanto o serviço compartilhado inicia.</p></div>
          </section>
        )}

        {platformContextError && (
          <section className="platform-context-notice is-warning" role="alert">
            <div><strong>Projetos temporariamente indisponíveis</strong><p>{platformContextError}</p></div>
            <button type="button" className="btn-module btn-module-secondary" onClick={() => setPlatformContextReload((value) => value + 1)}>Tentar novamente</button>
          </section>
        )}

        {!platformContextError && !selectedProject && (
          <ProjectHub
            projects={projects}
            isRefreshing={platformContextLoading}
            onSelectProject={handleSelectProject}
            onCreateProject={() => setCreateProjectModalOpen(true)}
          />
        )}

        {selectedProject && repoDataError && !selectedRepo && (
          <section className="platform-context-notice is-warning" role="alert">
            <div><strong>Repositórios indisponíveis</strong><p>{repoDataError}</p></div>
            <button type="button" className="btn-module btn-module-secondary" onClick={() => void loadProjectRepositories(selectedProject)}>Tentar novamente</button>
          </section>
        )}

        {/* Feedback flutuante de sincronização */}
        {syncFeedback && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 28,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--primary-border)',
              color: 'var(--primary)',
              padding: '10px 16px',
              borderRadius: 8,
              boxShadow: 'var(--shadow-modal)',
              fontSize: 12,
              fontWeight: 500,
              zIndex: 100,
            }}
          >
            {syncFeedback}
          </div>
        )}

        {/* Visualização de Conteúdo por Aba Selecionada */}
        {selectedProject && activeTab === 'overview' && (
          <OverviewTab
            selectedRepo={selectedRepo}
            commits={commits}
            connectivity={connectivity}
            flow={flow}
            onSyncNow={handleSyncNow}
            syncing={syncing}
          />
        )}

        {selectedProject && activeTab === 'auth' && (
          <AuthTab
            repository={selectedRepo}
            project={selectedProject}
            onRequestUnlinkRepository={() => selectedRepo && setDisconnectRepository(selectedRepo)}
            onTokenValidated={(token) => {
              if (selectedRepo) setRepositoryTokens((current) => ({ ...current, [selectedRepo.id]: token }))
            }}
          />
        )}

        {selectedProject && activeTab === 'webhooks' && (
          <WebhooksTab
            repository={selectedRepo}
            deliveries={deliveries}
            onRefreshData={handleRefreshRepositoryData}
          />
        )}

        {selectedProject && activeTab === 'sync' && (
          <SyncTab
            repository={selectedRepo}
            commits={commits}
            branches={branches}
            pullRequests={pullRequests}
            flow={flow}
            onSyncNow={handleSyncNow}
            syncing={syncing}
            loading={repoDataLoading}
            error={repoDataError}
          />
        )}

        {selectedProject && activeTab === 'analytics' && <IntelligenceTab repository={selectedRepo} />}

        {selectedProject && activeTab === 'devops' && (
          <DevelopmentTab
            title="DevOps e documentação"
            status="Em desenvolvimento"
            description="A documentação real já está acessível; estados de release, deploy e cobertura só aparecerão quando vierem de uma fonte verificável."
            available={[
              'Swagger UI e schema OpenAPI gerados pelo backend',
              'Contrato OpenAPI validado sem erros ou avisos no CI',
              'Workflow de CI e arquivos de deployment versionados no repositório',
            ]}
            pending={[
              'Expor status real de build, cobertura, release e deploy antes de recriar os cards da POC',
            ]}
            showDocumentation
          />
        )}
      </main>

      {/* Modal para Conectar Repositório via Link do GitHub */}
      <ConnectRepoModal
        isOpen={connectModalOpen}
        projectId={selectedProject?.id || null}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={handleRepoConnected}
      />
      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onSuccess={(project) => {
          setProjects((current) => {
            const updated = [project, ...current.filter((item) => item.id !== project.id)]
            savePlatformProjectsCache(platformSession.user.id, updated)
            return updated
          })
          handleSelectProject(project)
        }}
      />
      <DisconnectRepositoryModal
        repository={disconnectRepository}
        loading={disconnectingRepository}
        onCancel={() => { if (!disconnectingRepository) setDisconnectRepository(null) }}
        onConfirm={() => void handleDisconnectRepository()}
      />
    </div>
  )
}
