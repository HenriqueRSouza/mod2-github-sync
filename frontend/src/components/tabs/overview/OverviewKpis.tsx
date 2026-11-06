import React from 'react'
import { GitCommit, CheckCircle2, Zap, Radio } from 'lucide-react'

interface OverviewKpisProps {
  totalCommits: number
  latencyMs?: number
  connectivityStatus?: 'up' | 'down'
  showIdeation?: boolean
}

export const OverviewKpis: React.FC<OverviewKpisProps> = ({
  totalCommits,
  latencyMs,
  connectivityStatus,
  showIdeation = false,
}) => {
  return (
    <div className="module-kpi-grid">
      {/* KPI 1: Commits Indexados (REAL DO BANCO) */}
      <div className="kpi-box">
        <div className="kpi-top">
          <span className="kpi-title">COMMITS INDEXADOS</span>
          <div className="kpi-icon-wrap" style={{ color: '#60A5FA' }}>
            <GitCommit size={15} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{totalCommits}</span>
          <span className="kpi-trend trend-up">Commits indexados</span>
        </div>
        <span className="kpi-footnote">Commits persistidos no banco configurado</span>
      </div>

      {/* KPI 2: Taxa de Sucesso */}
      {showIdeation && <div className="kpi-box">
        <div className="kpi-top">
          <span className="kpi-title">TAXA DE SUCESSO</span>
          <div className="kpi-icon-wrap" style={{ color: '#34D399' }}>
            <CheckCircle2 size={15} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">99,4%</span>
          <span className="kpi-trend trend-up">+0,2%</span>
        </div>
        <span className="kpi-footnote">Últimas 100 execuções do Celery</span>
      </div>}

      {/* KPI 3: Latência da API do GitHub (REAL DO HEALTH CHECK) */}
      <div className="kpi-box">
        <div className="kpi-top">
          <span className="kpi-title">LATÊNCIA GITHUB API</span>
          <div className="kpi-icon-wrap" style={{ color: '#FBBF24' }}>
            <Zap size={15} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{latencyMs == null ? '—' : `${latencyMs} ms`}</span>
          <span className={`kpi-trend ${connectivityStatus === 'up' ? 'trend-up' : 'trend-warning'}`}>
            {connectivityStatus === 'up' ? 'Conectado' : 'Sem leitura'}
          </span>
        </div>
        <span className="kpi-footnote">Endpoint /health/github-connectivity</span>
      </div>

      {/* KPI 4: Webhook Status */}
      {showIdeation && <div className="kpi-box">
        <div className="kpi-top">
          <span className="kpi-title">STATUS DO WEBHOOK</span>
          <div className="kpi-icon-wrap" style={{ color: '#38BDF8' }}>
            <Radio size={15} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number" style={{ fontSize: 20 }}>
            Demonstração
          </span>
          <span className="kpi-trend trend-up">HMAC ativo</span>
        </div>
        <span className="kpi-footnote">Fila Celery pronta para eventos Git</span>
      </div>}
    </div>
  )
}
