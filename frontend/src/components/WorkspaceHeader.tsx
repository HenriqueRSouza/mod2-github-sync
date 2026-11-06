import React from 'react'
import { FolderGit2, GitBranch, Plus, RefreshCw } from 'lucide-react'
import type { ConnectivityStatus, PlatformProject, Repository } from '../api'
import type { TabId } from './Header'

interface WorkspaceHeaderProps {
  activeTab: TabId
  repositories: Repository[]
  selectedProject: PlatformProject | null
  selectedRepo: Repository | null
  onSelectRepo: (repo: Repository) => void
  onOpenConnectModal: () => void
  onSyncNow: () => void
  syncing: boolean
  connectivity: ConnectivityStatus | null
}

const tabMeta: Record<TabId, { breadcrumb: string; title: string }> = {
  overview: { breadcrumb: 'Visão geral', title: 'Integração e Sincronização com GitHub' },
  auth: { breadcrumb: 'Conectividade', title: 'Conectividade e Autenticação GitHub' },
  webhooks: { breadcrumb: 'Webhooks', title: 'Monitor de Webhooks e Entregas Persistidas' },
  sync: { breadcrumb: 'Repositório', title: 'Indexação e Sincronização do Repositório' },
  analytics: { breadcrumb: 'Analytics', title: 'Analytics de Fluxo e Diagnóstico de Gargalos' },
  devops: { breadcrumb: 'Documentação', title: 'DevOps, Qualidade e Governança da Release' },
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeTab,
  repositories,
  selectedProject,
  selectedRepo,
  onSelectRepo,
  onOpenConnectModal,
  onSyncNow,
  syncing,
  connectivity,
}) => {
  const { breadcrumb, title } = selectedProject
    ? tabMeta[activeTab]
    : { breadcrumb: 'Projetos', title: 'Seus projetos' }

  return (
    <header className="module-header">
      <div className="header-row-primary">
        <div className="header-title-box">
          <div className="header-breadcrumb">MÓDULO 2 <span>/</span> {breadcrumb}</div>
          <h1 className="header-h1">{title}</h1>
        </div>

        {selectedProject && <div className="header-controls">
          <div className="select-chip" title="Selecionar repositório">
            <FolderGit2 size={14} className="control-icon-repository" />
            <span>repo:</span>
            <select
              className="header-repository-select"
              aria-label="Selecionar repositório"
              value={selectedRepo?.id || ''}
              onChange={(event) => {
                const found = repositories.find((repository) => repository.id === Number(event.target.value))
                if (found) onSelectRepo(found)
              }}
            >
              {repositories.length === 0 && <option value="">Nenhum repo conectado</option>}
              {repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.full_name}</option>)}
            </select>
          </div>

          {selectedRepo && <div className="select-chip branch-chip" title="Branch principal"><GitBranch size={14} /><strong>{selectedRepo.default_branch || 'main'}</strong></div>}

          <div
            className={`status-pill ${connectivity?.status === 'up' ? 'status-pill-success' : 'status-pill-neutral'}`}
            title={connectivity ? `Latência: ${connectivity.latency_ms}ms` : 'Verificando conectividade em segundo plano'}
          >
            <span className="status-pill-dot" />
            <span>{connectivity?.status === 'up' ? 'GitHub disponível' : 'Verificando GitHub'}</span>
          </div>

          <button
            type="button"
            onClick={onOpenConnectModal}
            disabled={!selectedProject}
            className="btn-module btn-module-secondary"
            title={selectedProject ? 'Conectar novo repositório' : 'Crie ou selecione um projeto primeiro'}
          >
            <Plus size={14} /><span>{selectedProject ? 'Conectar repositório' : 'Selecione um projeto'}</span>
          </button>

          <button
            type="button"
            onClick={onSyncNow}
            disabled={syncing || !selectedRepo}
            className="btn-module btn-module-primary"
            title={selectedRepo ? 'Sincronizar dados com a API do GitHub' : 'Conecte um repositório para sincronizar'}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Sincronizando…' : selectedRepo ? 'Sincronizar agora' : 'Conecte um repositório'}</span>
          </button>
        </div>}
      </div>
    </header>
  )
}
