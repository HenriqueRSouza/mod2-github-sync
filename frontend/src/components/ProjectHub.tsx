import React from 'react'
import { ArrowRight, FolderGit2, FolderPlus } from 'lucide-react'
import type { PlatformProject } from '../api'

interface ProjectHubProps {
  projects: PlatformProject[]
  isRefreshing?: boolean
  onSelectProject: (project: PlatformProject) => void
  onCreateProject: () => void
}

const projectDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export const ProjectHub: React.FC<ProjectHubProps> = ({ projects, isRefreshing = false, onSelectProject, onCreateProject }) => (
  <section className="project-hub" aria-labelledby="project-hub-title">
    <div className="project-hub-heading">
      <div>
        <span className="project-hub-eyebrow">CONTEXTO DA PLATAFORMA</span>
        <h2 id="project-hub-title">Escolha um projeto para continuar</h2>
        <p>O projeto define quais repositórios, webhooks e indicadores serão exibidos no módulo. A criação e a exclusão do projeto compartilhado são responsabilidades do Módulo 1; aqui você administra somente as integrações GitHub Sync. {isRefreshing ? 'Atualizando a lista em segundo plano…' : ''}</p>
      </div>
      <button type="button" className="btn-module btn-module-primary" onClick={onCreateProject}>
        <FolderPlus size={15} /> Criar projeto
      </button>
    </div>

    {projects.length > 0 ? (
      <div className="project-card-grid" aria-label="Seus projetos">
        {projects.map((project) => (
          <button
            type="button"
            className="project-card"
            key={project.id}
            onClick={() => onSelectProject(project)}
            aria-label={`Abrir projeto ${project.name}`}
          >
            <div className="project-card-icon"><FolderGit2 size={19} /></div>
            <div className="project-card-copy">
              <strong>{project.name}</strong>
              <p>{project.description || 'Sem descrição cadastrada.'}</p>
              <span>Criado em {projectDate.format(new Date(project.created_at))}</span>
            </div>
            <ArrowRight className="project-card-arrow" size={17} />
          </button>
        ))}
      </div>
    ) : isRefreshing ? (
      <div className="project-hub-empty" role="status">
        <div className="project-empty-icon">…</div>
        <strong>Carregando seus projetos</strong>
        <p>O serviço de projetos pode levar alguns segundos para despertar no primeiro acesso.</p>
      </div>
    ) : (
      <div className="project-hub-empty">
        <div className="project-empty-icon">M1</div>
        <strong>Você ainda não possui projetos</strong>
        <p>Crie o primeiro projeto na plataforma para conectar e acompanhar seus repositórios.</p>
        <button type="button" className="btn-module btn-module-secondary" onClick={onCreateProject}>
          <FolderPlus size={15} /> Criar primeiro projeto
        </button>
      </div>
    )}
  </section>
)
