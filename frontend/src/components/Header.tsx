import React from 'react'
import {
  GitBranch,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  FolderGit2,
  Lock,
  Radio,
  BarChart3,
  Rocket,
  FolderPlus,
  LogOut,
  UserCircle2,
} from 'lucide-react'
import type { ConnectivityStatus, PlatformProject, Repository } from '../api'
import type { PlatformUser } from '../platformSession'

export type TabId = 'overview' | 'auth' | 'webhooks' | 'sync' | 'analytics' | 'devops'

interface HeaderProps {
  activeTab: TabId
  onSelectTab: (tab: TabId) => void
  repositories: Repository[]
  projects: PlatformProject[]
  selectedProject: PlatformProject | null
  user: PlatformUser
  selectedRepo: Repository | null
  onSelectProject: (project: PlatformProject) => void
  onSelectRepo: (repo: Repository) => void
  onOpenCreateProject: () => void
  onOpenConnectModal: () => void
  onSyncNow: () => void
  syncing: boolean
  connectivity: ConnectivityStatus | null
  onLogout: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  repositories,
  projects,
  selectedProject,
  user,
  selectedRepo,
  onSelectProject,
  onSelectRepo,
  onOpenCreateProject,
  onOpenConnectModal,
  onSyncNow,
  syncing,
  connectivity,
  onLogout,
}) => {
  // Breadcrumb e Título baseados na tela ativa
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'overview':
        return {
          breadcrumb: 'Integrações',
          title: 'Integração e Sincronização com GitHub',
        }
      case 'auth':
        return {
          breadcrumb: 'Integrações',
          title: 'Conectividade e Autenticação GitHub',
        }
      case 'webhooks':
        return {
          breadcrumb: 'Integrações',
          title: 'Monitor de Webhooks e Entregas Persistidas',
        }
      case 'sync':
        return {
          breadcrumb: 'Integrações',
          title: 'Indexação e Sincronização do Repositório',
        }
      case 'analytics':
        return {
          breadcrumb: 'Analytics',
          title: 'Analytics de Fluxo e Diagnóstico de Gargalos',
        }
      case 'devops':
        return {
          breadcrumb: 'Release engineering',
          title: 'DevOps, Qualidade e Governança da Release',
        }
    }
  }

  const { breadcrumb, title } = getHeaderMeta()

  return (
    <header className="module-header">
      {/* Linha Superior com Título e Ações */}
      <div className="header-row-primary">
        <div className="header-title-box">
          <div className="header-breadcrumb">
            MÓDULO 2 <span>/</span> {breadcrumb}
          </div>
          <h1 className="header-h1">{title}</h1>
        </div>

        <div className="header-controls">
          <div className="select-chip" title="Projeto da plataforma">
            <FolderGit2 size={13} style={{ color: '#A78BFA' }} />
            <span>projeto:</span>
            <select
              className="header-repository-select"
              aria-label="Selecionar projeto"
              value={selectedProject?.id || ''}
              onChange={(event) => {
                const found = projects.find((project) => project.id === event.target.value)
                if (found) onSelectProject(found)
              }}
            >
              {projects.length === 0 && <option value="">Nenhum projeto</option>}
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>

          <button type="button" onClick={onOpenCreateProject} className="btn-module btn-module-secondary" title="Criar projeto no Módulo 1">
            <FolderPlus size={13} />
            <span>Novo projeto</span>
          </button>

          {/* Seletor de Repositório Conectado */}
          <div className="select-chip" title="Selecionar Repositório">
            <FolderGit2 size={13} style={{ color: '#60A5FA' }} />
            <span>repo:</span>
            <select
              className="header-repository-select"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
              value={selectedRepo?.id || ''}
              onChange={(e) => {
                const found = repositories.find((r) => r.id === Number(e.target.value))
                if (found) onSelectRepo(found)
              }}
            >
              {repositories.length === 0 && <option value="">Nenhum repo conectado</option>}
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id} style={{ background: '#0D1322' }}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Branch */}
          <div className="select-chip" title="Branch Principal">
            <GitBranch size={13} style={{ color: 'var(--text-tertiary)' }} />
            <span>branch:</span>
            <strong>{selectedRepo?.default_branch || 'main'}</strong>
          </div>

          {/* Badge de Conectividade GitHub */}
          <div
            className={`status-pill ${
              connectivity?.status === 'up' ? 'status-pill-success' : 'status-pill-danger'
            }`}
            title={`Latência: ${connectivity?.latency_ms ?? '--'}ms`}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: connectivity?.status === 'up' ? '#10B981' : '#EF4444',
                boxShadow: connectivity?.status === 'up' ? '0 0 6px #10B981' : 'none',
              }}
            />
            <span>{connectivity?.status === 'up' ? 'GitHub conectado' : 'GitHub desconectado'}</span>
          </div>

          {/* Botão Conectar Repositório (abre modal via Link GitHub) */}
          <button
            onClick={onOpenConnectModal}
            disabled={!selectedProject}
            className="btn-module btn-module-secondary"
            title={selectedProject ? 'Conectar novo repositório colando a URL do GitHub' : 'Crie ou selecione um projeto primeiro'}
          >
            <Plus size={13} />
            <span>{selectedProject ? '+ Conectar Repo' : 'Selecione um projeto'}</span>
          </button>

          {/* Botão Configurar */}
          <button
            onClick={() => onSelectTab('auth')}
            className="btn-module btn-module-secondary"
            title="Configurações e Credenciais"
          >
            <SlidersHorizontal size={13} />
            <span>Configurar</span>
          </button>

          {/* Botão Sincronizar Agora */}
          <button
            onClick={onSyncNow}
            disabled={syncing || !selectedRepo}
            className="btn-module btn-module-primary"
            title={selectedRepo ? 'Sincronizar dados diretamente da API do GitHub' : 'Conecte um repositório para sincronizar'}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Sincronizando...' : selectedRepo ? 'Sincronizar agora' : 'Conecte um repositório'}</span>
          </button>

          <div className="header-account" title={user.email}>
            <UserCircle2 size={15} />
            <span>{user.display_name}</span>
            <button type="button" onClick={onLogout} aria-label="Sair da plataforma" title="Encerrar sessão">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Navegação pelas áreas previstas nas POCs. DevOps usa um estado explícito até haver fonte remota verificável. */}
      <nav className="module-tabs-bar" aria-label="Navegação do Módulo 2">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
        >
          <FolderGit2 size={13} />
          <span>Visão Geral</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
          onClick={() => onSelectTab('auth')}
        >
          <Lock size={13} />
          <span>Conectividade & Autenticação</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
          onClick={() => onSelectTab('webhooks')}
        >
          <Radio size={13} />
          <span>Monitor de Webhooks</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => onSelectTab('sync')}
        >
          <RefreshCw size={13} />
          <span>Indexação & Contribuintes</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onSelectTab('analytics')}
          title="Indicadores calculados a partir dos commits indexados"
        >
          <BarChart3 size={13} />
          <span>Analytics</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'devops' ? 'active' : ''}`}
          onClick={() => onSelectTab('devops')}
          title="Em desenvolvimento: documentação real já disponível"
        >
          <Rocket size={13} />
          <span>DevOps & Docs · em desenvolvimento</span>
        </button>
      </nav>
    </header>
  )
}
