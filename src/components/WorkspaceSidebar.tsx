import React from 'react'
import { BarChart3, ChevronLeft, ChevronRight, FileText, FolderCog, FolderGit2, FolderPlus, LogOut, Menu, Radio, RefreshCw, ShieldCheck } from 'lucide-react'
import type { PlatformProject } from '../api'
import type { PlatformUser } from '../platformSession'
import type { TabId } from './Header'

interface WorkspaceSidebarProps {
  activeTab: TabId
  onSelectTab: (tab: TabId) => void
  collapsed: boolean
  onToggle: () => void
  user: PlatformUser
  projects: PlatformProject[]
  projectsLoading: boolean
  projectsError: boolean
  selectedProject: PlatformProject | null
  onSelectProject: (project: PlatformProject | null) => void
  onOpenProjects: () => void
  onOpenCreateProject: () => void
  onLogout: () => void
}

const navigation: { id: TabId; label: string; icon: React.ElementType; comingSoon?: boolean }[] = [
  { id: 'overview', label: 'Visão geral', icon: FolderGit2 },
  { id: 'auth', label: 'Conectividade e autenticação', icon: ShieldCheck },
  { id: 'webhooks', label: 'Monitor de webhooks', icon: Radio },
  { id: 'sync', label: 'Indexação e contribuintes', icon: RefreshCw },
  { id: 'analytics', label: 'Analytics e insights', icon: BarChart3 },
  { id: 'devops', label: 'DevOps e documentação', icon: FileText, comingSoon: true },
]

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggle,
  user,
  projects,
  projectsLoading,
  projectsError,
  selectedProject,
  onSelectProject,
  onOpenProjects,
  onOpenCreateProject,
  onLogout,
}) => (
  <aside className={`module-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
    <div className="sidebar-top">
      <div className="sidebar-brand-row">
        <div className="module-brand">
          <div className="module-logo-icon">M2</div>
          <div className="module-logo-text"><span className="module-brand-name">GitHub Sync</span><span className="module-brand-sub">MÓDULO 2</span></div>
        </div>
        <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <span className="desktop-toggle-icon">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</span>
          <Menu className="mobile-toggle-icon" size={18} />
        </button>
      </div>

      {collapsed ? (
        <button type="button" className="workspace-selector workspace-selector-collapsed" onClick={onToggle} title={selectedProject?.name || 'Selecionar projeto'}>
          <FolderGit2 size={17} />
        </button>
      ) : (
        <div className="workspace-project-picker">
          <div className="workspace-selector" title="Projeto ativo">
            <span className="workspace-badge">M2</span>
            <select
              className="workspace-project-select"
              aria-label="Selecionar projeto no menu lateral"
              aria-busy={projectsLoading}
              disabled={projectsLoading && projects.length === 0}
              value={selectedProject?.id || ''}
              onChange={(event) => {
                const project = projects.find((item) => item.id === event.target.value) || null
                onSelectProject(project)
              }}
            >
              <option value="">{projectsLoading && projects.length === 0 ? 'Carregando projetos…' : projectsError && projects.length === 0 ? 'Projetos indisponíveis' : 'Selecione um projeto'}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <button type="button" className="workspace-project-create" onClick={onOpenCreateProject} aria-label="Criar novo projeto" title="Criar novo projeto">
            <FolderPlus size={16} />
          </button>
        </div>
      )}

      {selectedProject ? (
        <nav className="sidebar-navigation" aria-label="Navegação do Módulo 2">
          <button type="button" className="nav-item nav-item-projects" onClick={onOpenProjects} title={collapsed ? 'Gerenciar projetos' : undefined}>
            <FolderCog size={17} /><span className="nav-item-label">Gerenciar projetos</span>
          </button>
          <span className="nav-group-title">NAVEGAÇÃO</span>
          {navigation.map(({ id, label, icon: Icon, comingSoon }) => (
            <button
              type="button"
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => onSelectTab(id)}
              title={collapsed ? label : undefined}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={17} /><span className="nav-item-label">{label}</span>{comingSoon && <span className="nav-status-badge">em breve</span>}
            </button>
          ))}
        </nav>
      ) : !collapsed ? (
        <p className="sidebar-project-hint" role={projectsLoading ? 'status' : undefined}>
          {projectsLoading && projects.length === 0
            ? 'Buscando seus projetos. O serviço compartilhado pode levar alguns segundos para iniciar.'
            : projectsError && projects.length === 0
              ? 'Não foi possível carregar os projetos. Use “Tentar novamente” na área principal.'
              : 'Selecione ou crie um projeto para acessar as áreas do módulo.'}
        </p>
      ) : null}
    </div>

    <div className="sidebar-footer">
      <div className="user-profile-strip" title={`${user.display_name} · ${user.email}`}>
        <div className="user-avatar-circle">{user.display_name?.slice(0, 2).toUpperCase() || 'M2'}</div>
        <div className="user-meta"><span className="user-meta-name">{user.display_name}</span><span className="user-meta-role">{user.email}</span></div>
        <button type="button" className="sidebar-logout" onClick={onLogout} aria-label="Sair da plataforma" title="Sair da plataforma"><LogOut size={16} /></button>
      </div>
    </div>
  </aside>
)
