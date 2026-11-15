import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bot, BrainCircuit, RefreshCw } from 'lucide-react'
import { api, type Repository, type RepositoryIntelligence } from '../../api'

interface IntelligenceTabProps {
  repository: Repository | null
}

const bottleneckLabels: Record<string, string> = {
  author_concentration: 'Concentração de autoria',
  off_hours_activity: 'Atividade fora da janela de referência',
  commit_bursts: 'Picos de commits',
}

export const IntelligenceTab = ({ repository }: IntelligenceTabProps) => {
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<RepositoryIntelligence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!repository) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await api.insights(repository.id, period))
    } catch {
      setData(null)
      setError('Não foi possível calcular os indicadores deste repositório.')
    } finally {
      setLoading(false)
    }
  }, [repository, period])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- recalcula ao trocar repositorio ou periodo.
    void load()
  }, [load])

  if (!repository) {
    return (
      <div className="view-container">
        <div className="module-card" role="status">
          <div className="module-card-title">Conecte um repositório para iniciar a análise</div>
          <p className="module-card-subtitle">Esta área calcula indicadores somente sobre commits realmente indexados.</p>
        </div>
      </div>
    )
  }

  const title = 'Analytics e inteligência sobre o fluxo Git'
  const Icon = BrainCircuit

  return (
    <div className="view-container">
      <div className="section-intro-bar">
        <div>
          <h2 className="section-intro-title">{title} • {repository.full_name}</h2>
          <p className="section-intro-desc">
            Frequência, concentração, gargalos e clareza calculados a partir dos commits indexados no período.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="select-chip">
            <span>período:</span>
            <select
              aria-label="Período da análise"
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value))}
              style={{ background: 'transparent', border: 0, color: 'inherit' }}
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </label>
          <button type="button" onClick={() => void load()} disabled={loading} className="btn-module btn-module-primary btn-module-sm">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Calculando...' : 'Atualizar análise'}
          </button>
        </div>
      </div>

      {error && <div className="status-pill status-pill-danger" role="alert">{error}</div>}

      {data && (
        <>
          <div className="analysis-mode-banner" role="status">
            <Bot size={15} />
            <div>
              <strong>{data.analysis_mode.startsWith('provider:') ? 'LLM conectado' : 'Análise determinística ativa'}</strong>
              <span>
                {data.analysis_mode.startsWith('provider:')
                  ? ` Recomendações complementares geradas pelo provedor ${data.analysis_mode.replace('provider:', '')} sobre indicadores agregados.`
                  : ' Os indicadores e recomendações atuais são calculados por regras auditáveis sobre commits reais; nenhum LLM externo está processando o código.'}
              </span>
            </div>
          </div>
          <div className="module-kpi-grid">
            <div className="kpi-box">
              <span className="kpi-title">COMMITS NO PERÍODO</span>
              <div className="kpi-number">{data.total_commits}</div>
              <span className="kpi-footnote">Janela real de {data.period_days} dias</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-title">CLAREZA MÉDIA</span>
              <div className="kpi-number">{data.average_clarity_score == null ? '—' : `${data.average_clarity_score}/100`}</div>
              <span className="kpi-footnote">Mensagens avaliadas pelo motor {data.analysis_mode}</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-title">CONCENTRAÇÃO</span>
              <div className="kpi-number">{data.indicators.author_concentration_percent}%</div>
              <span className="kpi-footnote">Maior participação: {data.indicators.top_author || 'sem dados'}</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-title">FORA DE 7H–22H</span>
              <div className="kpi-number">{data.indicators.off_hours_percent}%</div>
              <span className="kpi-footnote">Indicador de cadência, não avaliação individual</span>
            </div>
          </div>

          <div className="responsive-grid-two">
            <div className="module-card">
              <div className="module-card-title"><AlertTriangle size={15} /> Gargalos observados</div>
              {data.bottlenecks.length === 0 ? (
                <p className="module-card-subtitle">Nenhum gargalo foi sinalizado pelos critérios atuais.</p>
              ) : data.bottlenecks.map((item) => (
                <div key={item.code} className="code-box-dark" style={{ marginTop: 10 }}>
                  <span className={`badge ${item.severity === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                    {bottleneckLabels[item.code] || 'Indicador observado'}
                  </span>
                  <p style={{ margin: '8px 0 0' }}>{item.evidence}</p>
                </div>
              ))}
            </div>
            <div className="module-card">
              <div className="module-card-title"><Bot size={15} /> Recomendações revisáveis</div>
              {data.recommendations.length === 0 ? (
                <p className="module-card-subtitle">Sem recomendações para os dados atuais.</p>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
                  {data.recommendations.map((item) => <li key={item}>{item}</li>)}
                </ol>
              )}
              <p className="module-card-subtitle" style={{ marginTop: 12 }}>
                Modo: {data.analysis_mode}. Recomendações apoiam a revisão humana e não medem desempenho individual.
              </p>
            </div>
          </div>

          <div className="module-card">
            <div className="module-card-title"><Icon size={15} /> Clareza recente das mensagens</div>
            <div className="table-responsive">
              <table className="module-table">
                <thead><tr><th>COMMIT</th><th>MENSAGEM</th><th>AUTOR</th><th>NOTA</th><th>LEITURA</th></tr></thead>
                <tbody>
                  {data.recent_commit_quality.map((item) => (
                    <tr key={item.sha}>
                      <td><span style={{ fontFamily: 'var(--font-mono)' }}>{item.sha.slice(0, 7)}</span></td>
                      <td>{item.message}</td>
                      <td>{item.author || 'não informado'}</td>
                      <td><strong>{item.score}/100</strong></td>
                      <td><span className={`badge ${item.label === 'clara' ? 'badge-success' : item.label === 'vaga' ? 'badge-danger' : 'badge-warning'}`}>{item.label}</span></td>
                    </tr>
                  ))}
                  {data.recent_commit_quality.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}>Não há commits indexados no período selecionado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
