import type React from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Code2, GitBranch, ShieldCheck } from 'lucide-react'
import { apiDocumentation } from '../api'

interface LandingPageProps {
  onEnterWorkspace: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterWorkspace }) => (
  <main className="landing-page">
    <header className="landing-header">
      <div className="module-brand">
        <div className="module-logo-icon">M2</div>
        <div className="module-logo-text">
          <span className="module-brand-name">GitHub Sync</span>
          <span className="module-brand-sub">MÓDULO 2</span>
        </div>
      </div>
      <a className="landing-doc-link" href={apiDocumentation.swagger} target="_blank" rel="noreferrer">
        <BookOpen size={15} /> Documentação da API
      </a>
    </header>

    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-eyebrow"><GitBranch size={15} /> Módulo 2 · Integração GitHub</div>
      <h1 id="landing-title">Conecte, sincronize e consulte a atividade de um repositório.</h1>
      <p>
        Este módulo recebe repositórios GitHub, acompanha eventos e disponibiliza commits e métricas
        para os demais módulos da plataforma acadêmica.
      </p>
      <div className="landing-actions">
        <button className="btn-module btn-module-primary" onClick={onEnterWorkspace}>
          Entrar no workspace <ArrowRight size={15} />
        </button>
        <a className="btn-module btn-module-secondary" href={apiDocumentation.schema} target="_blank" rel="noreferrer">
          <Code2 size={14} /> Especificação OpenAPI
        </a>
      </div>
    </section>

    <section className="landing-grid" aria-label="Status das capacidades">
      <article className="landing-card">
        <CheckCircle2 size={20} className="landing-card-icon success" />
        <div>
          <span className="badge badge-success">Disponível</span>
          <h2>Jornada de repositório</h2>
          <p>Conexão por URL, seleção do repositório, sincronização, commits, webhooks e métricas de fluxo.</p>
        </div>
      </article>
      <article className="landing-card">
        <ShieldCheck size={20} className="landing-card-icon info" />
        <div>
          <span className="badge badge-info">Integração</span>
          <h2>Contrato para módulos</h2>
          <p>Swagger UI e schema OpenAPI documentam os endpoints publicados pelo módulo GitHub.</p>
        </div>
      </article>
      <article className="landing-card">
        <Code2 size={20} className="landing-card-icon warning" />
        <div>
          <span className="badge badge-success">Disponível</span>
          <h2>Analytics e inteligência Git</h2>
          <p>Indicadores auditáveis de frequência, clareza, concentração, gargalos e recomendações revisáveis.</p>
        </div>
      </article>
    </section>

    <footer className="landing-footer">
      <span>Use um Personal Access Token apenas quando o repositório exigir acesso autenticado.</span>
      <a href={apiDocumentation.swagger} target="_blank" rel="noreferrer">Abrir guia de integração</a>
    </footer>
  </main>
)
