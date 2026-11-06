import React from 'react'
import { CheckCircle2, Clock3, Construction } from 'lucide-react'
import { apiDocumentation } from '../../api'

interface DevelopmentTabProps {
  title: string
  status: 'Em desenvolvimento' | 'Em breve'
  description: string
  available: string[]
  pending: string[]
  showDocumentation?: boolean
}

export const DevelopmentTab: React.FC<DevelopmentTabProps> = ({
  title,
  status,
  description,
  available,
  pending,
  showDocumentation = false,
}) => (
  <div className="view-container">
    <div className="section-intro-bar">
      <div>
        <h2 className="section-intro-title">{title}</h2>
        <p className="section-intro-desc">{description}</p>
      </div>
      <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {status === 'Em breve' ? <Clock3 size={12} /> : <Construction size={12} />}
        {status}
      </span>
    </div>

    <div className="module-card">
      <div className="module-card-header">
        <div>
          <div className="module-card-title">Estado desta área</div>
          <div className="module-card-subtitle">
            Esta tela permanece navegável para representar a POC, sem exibir dados fictícios ou ações sem backend.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <section className="code-box-dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} /> Base já disponível
          </strong>
          {available.map((item) => (
            <span key={item} style={{ color: 'var(--text-muted)', fontSize: 12 }}>• {item}</span>
          ))}
        </section>

        <section className="code-box-dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock3 size={14} /> Falta implementar no Módulo 2
          </strong>
          {pending.map((item) => (
            <span key={item} style={{ color: 'var(--text-muted)', fontSize: 12 }}>• {item}</span>
          ))}
        </section>
      </div>

      {showDocumentation && (
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <a className="btn-module btn-module-primary" href={apiDocumentation.swagger} target="_blank" rel="noreferrer">
            Abrir Swagger
          </a>
          <a className="btn-module btn-module-secondary" href={apiDocumentation.schema} target="_blank" rel="noreferrer">
            Abrir OpenAPI
          </a>
        </div>
      )}
    </div>
  </div>
)
