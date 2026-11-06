import React, { useEffect, useState } from 'react'
import {
  Radio,
  CheckCircle2,
  Play,
  Pause,
  Download,
  Search,
  Send,
  X,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { api, apiOrigin, type Delivery, type Repository } from '../../api'

interface WebhooksTabProps {
  repository: Repository | null
  deliveries: Delivery[]
  onRefreshData?: () => void
}

interface WebhookEventItem {
  id: string
  event: string
  deliveryId: string
  author: string | null
  timestamp: string
  forcePush: boolean | null
  status: string
  branch: string
  attempts?: number
  error?: string | null
  receivedAt?: string
  processedAt?: string | null
  commitsCount?: number
  isDemo?: boolean
}

const deliveryStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    processed: 'Processado',
    failed: 'Falhou',
  }
  return labels[status] || status
}

const deliveryStatusBadge = (status: string) => {
  if (status === 'processed' || status === '202 Accepted') return 'badge-success'
  if (status === 'failed') return 'badge-danger'
  if (status === 'processing') return 'badge-info'
  return 'badge-warning'
}

const deliveryStatusDescription = (event: WebhookEventItem) => {
  if (event.isDemo) return 'Registro demonstrativo da ideação; não representa uma entrega processada.'
  if (event.status === 'processed') return 'A entrega foi processada pelo módulo e possui estado final persistido.'
  if (event.status === 'failed') return event.error || 'A entrega falhou sem detalhe adicional exposto pela API.'
  if (event.status === 'processing') return 'A entrega foi aceita e está sendo processada.'
  return 'A entrega foi aceita e aguarda processamento.'
}

// Utilitário para calcular HMAC-SHA256 no browser
async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message))
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const WebhooksTab: React.FC<WebhooksTabProps> = ({
  repository,
  deliveries,
  onRefreshData,
}) => {
  const [streamActive, setStreamActive] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEventType, setSelectedEventType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  // Gaveta lateral de inspeção JSON
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventItem | null>(null)
  const [activeJsonTab, setActiveJsonTab] = useState<'payload' | 'headers'>('payload')

  // Simulador de webhook
  const [showSimulator, setShowSimulator] = useState(false)
  const [simAuthor, setSimAuthor] = useState('EduardoFdeM')
  const [simBranch, setSimBranch] = useState('main')
  const [simMessage, setSimMessage] = useState('feat(ui): sincronizar eventos em tempo real no dashboard')
  const [simFile, setSimFile] = useState('frontend/src/App.tsx')
  const [simSecret, setSimSecret] = useState('')
  const [simStatus, setSimStatus] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const hasLiveDeliveries = deliveries.length > 0
  const showOperationalIdeation = false

  useEffect(() => {
    if (!streamActive || !repository || !onRefreshData) return
    const polling = window.setInterval(onRefreshData, 5000)
    return () => window.clearInterval(polling)
  }, [streamActive, repository, onRefreshData])

  // Eventos do Figma
  const defaultEvents: WebhookEventItem[] = [
    {
      id: '1',
      event: 'push',
      deliveryId: 'd7c9d13e-55c2-4f28-9b7a-80e08dfdd6a91',
      author: 'rafael-lima',
      timestamp: '02 out 2026 • 14:32:18',
      forcePush: false,
      status: '202 Accepted',
      branch: 'main',
    },
    {
      id: '2',
      event: 'pull_request',
      deliveryId: '6a2f8e75-d9b6-4b1a-b1d8-e4a192fa7c06',
      author: 'ana-martins',
      timestamp: '02 out 2026 • 14:31:52',
      forcePush: false,
      status: '202 Accepted',
      branch: 'feat/auth-v2',
    },
    {
      id: '3',
      event: 'pull_request_review',
      deliveryId: 'b34dd192-1a88-4cd4-8e67-980c18c7f4ee',
      author: 'bruna-nunes',
      timestamp: '02 out 2026 • 14:30:09',
      forcePush: false,
      status: '202 Accepted',
      branch: 'fix/metrics',
    },
    {
      id: '4',
      event: 'member',
      deliveryId: 'f90e6571-235c-4c9c-b25a-f6a4a24fa0b2',
      author: 'marina-costa',
      timestamp: '02 out 2026 • 14:27:44',
      forcePush: false,
      status: '202 Accepted',
      branch: 'main',
    },
    {
      id: '5',
      event: 'push',
      deliveryId: '845bfe44-a8cb-44cc-ba96-1da5a7467888',
      author: 'github-actions',
      timestamp: '02 out 2026 • 14:25:11',
      forcePush: true,
      status: '202 Accepted',
      branch: 'release/v1.0.0',
    },
    {
      id: '6',
      event: 'pull_request',
      deliveryId: '2a8c81e9-2c60-41a5-9647-a82fa9ec25fe',
      author: 'diego-freitas',
      timestamp: '02 out 2026 • 14:22:36',
      forcePush: false,
      status: '202 Accepted',
      branch: 'feat/data-models',
    },
    {
      id: '7',
      event: 'push',
      deliveryId: '7e29c40b-cd10-4f02-87d5-2db9a45b207d',
      author: 'carla-souza',
      timestamp: '02 out 2026 • 14:18:05',
      forcePush: false,
      status: '202 Accepted',
      branch: 'chore/cleanup',
    },
  ]

  // Entregas persistidas têm prioridade. A amostra do Figma só aparece quando
  // a flag explícita de ideação está habilitada.
  const displayEvents: WebhookEventItem[] =
    deliveries.length > 0
      ? deliveries.map((d) => ({
          id: d.delivery_id,
          event: d.event,
          deliveryId: d.delivery_id,
          author: null,
          timestamp: new Date(d.received_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          forcePush: null,
          status: d.status,
          branch: d.ref ? d.ref.replace('refs/heads/', '') : 'Não informado',
          attempts: d.attempts,
          error: d.error || null,
          receivedAt: d.received_at,
          processedAt: d.processed_at,
          commitsCount: d.commits_count,
        }))
      : showOperationalIdeation
        ? defaultEvents.map((event) => ({ ...event, isDemo: true }))
        : []

  const filteredEvents = displayEvents.filter((item) => {
    const matchesSearch =
      item.deliveryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.event.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEvent = selectedEventType === 'all' || item.event === selectedEventType
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    return matchesSearch && matchesEvent && matchesStatus
  })

  const openDrawer = (item: WebhookEventItem) => {
    setSelectedEvent(item)
    setDrawerOpen(true)
  }

  // Disparo simulado com cálculo HMAC-SHA256 no browser
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repository || simSecret.trim().length < 16) {
      setSimStatus('Informe o segredo configurado para este repositório (mínimo de 16 caracteres).')
      return
    }
    setSimulating(true)
    setSimStatus('Calculando digest HMAC-SHA256 e enviando payload...')

    try {
      const commitSha = Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      const deliveryId = window.crypto.randomUUID()
      const timestamp = new Date().toISOString()

      const payload = {
        repository: {
          id: repository.github_id,
          name: repository.name,
          owner: { login: repository.owner },
        },
        ref: `refs/heads/${simBranch}`,
        forced: false,
        commits: [
          {
            id: commitSha,
            message: simMessage,
            timestamp,
            url: `https://github.com/${repository.owner}/${repository.name}/commit/${commitSha.slice(0, 7)}`,
            author: {
              name: simAuthor,
              email: `${simAuthor.toLowerCase()}@mackenzie.br`,
              username: simAuthor,
            },
            added: [simFile],
            modified: [],
            removed: [],
          },
        ],
      }

      const bodyStr = JSON.stringify(payload)
      const signatureHex = await computeHmacSha256(simSecret.trim(), bodyStr)

      const { status, data } = await api.sendWebhook(bodyStr, {
        'X-Hub-Signature-256': `sha256=${signatureHex}`,
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': deliveryId,
      })

      if (status === 202) {
        setSimStatus(`Sucesso! Evento aceito (202 Accepted) · Delivery: ${deliveryId.slice(0, 8)}...`)
        if (onRefreshData) onRefreshData()
      } else if (status === 200 && data.status === 'ignored') {
        setSimStatus(`Idempotência: Evento duplicado ignorado com sucesso (200 OK).`)
      } else {
        setSimStatus(`Resposta: HTTP ${status} - ${data.detail || JSON.stringify(data)}`)
      }
    } catch (err: any) {
      setSimStatus(`Erro no envio: ${err.message}`)
    } finally {
      setSimulating(false)
      setSimSecret('')
    }
  }

  return (
    <div className="view-container">
      {/* Sub-header da Tela 09 */}
      <div className="section-intro-bar">
        <div>
          <h2 className="section-intro-title">Entregas de webhook</h2>
          <p className="section-intro-desc">
            Recepção segura, enfileiramento assíncrono e rastreabilidade dos eventos enviados pelo GitHub.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`status-pill ${hasLiveDeliveries ? 'status-pill-success' : 'status-pill-info'}`}>
            <Radio size={12} className={hasLiveDeliveries && streamActive ? 'animate-pulse' : ''} />
            <span>{streamActive ? 'ATUALIZAÇÃO AUTOMÁTICA A CADA 5S' : 'ATUALIZAÇÃO AUTOMÁTICA PAUSADA'}</span>
            <strong>{hasLiveDeliveries ? '● Entregas persistidas disponíveis' : 'Sem entregas persistidas'}</strong>
          </div>

          <button
            onClick={() => setStreamActive(!streamActive)}
            className="btn-module btn-module-secondary btn-module-sm"
          >
            {streamActive ? <Pause size={12} /> : <Play size={12} />}
            <span>{streamActive ? 'Pausar atualização' : 'Retomar atualização'}</span>
          </button>

          <button
            onClick={() => setShowSimulator(!showSimulator)}
            disabled={!repository}
            className="btn-module btn-module-primary btn-module-sm"
            title={repository ? 'Enviar um payload técnico assinado para validar o recebimento' : 'Selecione um repositório para testar o webhook'}
          >
            <Send size={12} />
            <span>{repository ? 'Testar recebimento' : 'Selecione um repositório'}</span>
          </button>
        </div>
      </div>

      {/* Card Verde: Saúde do Webhook */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Saúde do webhook</span>
              <span className={`badge ${hasLiveDeliveries ? 'badge-success' : 'badge-info'}`}>
                {hasLiveDeliveries ? '● Entregas persistidas' : 'Prévia sem entregas'}
              </span>
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontFamily: 'var(--font-mono)',
                color: '#38BDF8',
                marginTop: 2,
              }}
            >
              {apiOrigin}/webhooks/github
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 11 }}>
          <div>
            <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: 10 }}>ASSINATURA</span>
            <strong style={{ color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} /> HMAC validado por entrega
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: 10 }}>IDEMPOTÊNCIA</span>
            <strong style={{ color: 'var(--text-main)' }}>Delivery ID persistido</strong>
          </div>
        </div>
      </div>

      {/* Modal / Painel Inline do Simulador de Webhook */}
      {showSimulator && (
        <div className="module-card" style={{ borderColor: '#3B82F6' }}>
          <div className="module-card-header">
            <div className="module-card-title">
              <Send size={14} style={{ color: '#60A5FA' }} />
              <span>Teste técnico de recebimento (HMAC-SHA256)</span>
            </div>
            <button
              onClick={() => setShowSimulator(false)}
              aria-label="Fechar simulador de webhook"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>

          <p className="module-card-subtitle" style={{ marginBottom: 14 }}>
            Envia um payload assinado diretamente para este módulo; não cria eventos nem altera configurações no GitHub. Serve para validar assinatura, idempotência e persistência antes de configurar o webhook real.
          </p>

          <form onSubmit={handleSimulateWebhook} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="responsive-grid-three">
              <div>
                <label className="form-label">Autor do Commit</label>
                <input
                  type="text"
                  className="form-input"
                  value={simAuthor}
                  onChange={(e) => setSimAuthor(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Branch de Destino</label>
                <input
                  type="text"
                  className="form-input"
                  value={simBranch}
                  onChange={(e) => setSimBranch(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Arquivo Alterado</label>
                <input
                  type="text"
                  className="form-input"
                  value={simFile}
                  onChange={(e) => setSimFile(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Mensagem do Commit</label>
              <input
                type="text"
                className="form-input"
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Segredo do webhook deste repositório</label>
              <input
                type="password"
                className="form-input"
                placeholder="O mesmo segredo configurado no cadastro e no GitHub"
                value={simSecret}
                onChange={(e) => setSimSecret(e.target.value)}
                minLength={16}
                required
              />
              <span className="form-help">Usado somente no navegador para assinar este payload de teste; não é armazenado pela SPA.</span>
            </div>

            {simStatus && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: 'var(--bg-code)',
                  border: '1px solid var(--border-default)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--info)',
                }}
              >
                {simStatus}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="submit"
                disabled={simulating || !repository || simSecret.trim().length < 16}
                className="btn-module btn-module-primary"
              >
                <Send size={12} />
                <span>{simulating ? 'Enviando e validando HMAC...' : 'Disparar Push Assinado'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fila Assíncrona: 4 Cards KPI */}
      {showOperationalIdeation && <div className="module-card">
        <div className="module-card-header">
          <div>
            <div className="module-card-title">
              Fila assíncrona — ideação
              <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                Dados de demonstração
              </span>
            </div>
            <div className="module-card-subtitle">
              Throughput e saúde operacional do processamento em segundo plano via Celery & Redis.
            </div>
          </div>
        </div>

        <div className="kpi-grid-4">
          <div className="kpi-card" style={{ backgroundColor: 'var(--bg-card-secondary)' }}>
            <div className="kpi-card-header">
              <span className="kpi-title">Eventos Processados/min</span>
              <span className="badge badge-success">Estável</span>
            </div>
            <div className="kpi-value">1.284</div>
            <div className="kpi-sub">+12,4% na última hora</div>
          </div>

          <div className="kpi-card" style={{ backgroundColor: 'var(--bg-card-secondary)' }}>
            <div className="kpi-card-header">
              <span className="kpi-title">Tempo de Resposta (&lt;200ms)</span>
              <span className="badge badge-success">Dentro do SLA</span>
            </div>
            <div className="kpi-value">87 ms</div>
            <div className="kpi-sub">p95 146 ms • SLA atendido</div>
          </div>

          <div className="kpi-card" style={{ backgroundColor: 'var(--bg-card-secondary)' }}>
            <div className="kpi-card-header">
              <span className="kpi-title">Itens na Fila (Redis)</span>
              <span className="badge badge-success">Saudável</span>
            </div>
            <div className="kpi-value">18</div>
            <div className="kpi-sub">worker lag 2,1 s</div>
          </div>

          <div className="kpi-card" style={{ backgroundColor: 'var(--bg-card-secondary)' }}>
            <div className="kpi-card-header">
              <span className="kpi-title">Mensagens na DLQ</span>
              <span className="badge badge-warning">Revisar</span>
            </div>
            <div className="kpi-value">2</div>
            <div className="kpi-sub">0 novas nos últimos 30 min</div>
          </div>
        </div>
      </div>}

      {/* Tabela: Eventos Recentes */}
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <div className="module-card-title">
              Eventos recentes
              {!hasLiveDeliveries && showOperationalIdeation && (
                <span className="badge badge-warning">Ideação demonstrativa</span>
              )}
              {!hasLiveDeliveries && !showOperationalIdeation && (
                <span className="badge badge-info">Sem eventos persistidos</span>
              )}
            </div>
            <div className="module-card-subtitle">
              {hasLiveDeliveries
                ? 'Últimas entregas recebidas. Selecione uma linha para consultar os metadados persistidos.'
                : showOperationalIdeation
                  ? 'Amostra visual da ideação. Estes registros não vieram do backend.'
                  : 'Nenhuma entrega foi persistida. Envie um evento no simulador para validar o fluxo real.'}
            </div>
          </div>
          <button
            className="btn-module btn-module-secondary btn-module-sm"
            disabled
            title="A exportação de eventos ainda não possui endpoint próprio."
          >
            <Download size={12} />
            <span>Exportação em desenvolvimento</span>
          </button>
        </div>

        <div className="table-toolbar">
          <div className="search-input-wrap">
            <Search size={13} className="search-input-icon" />
            <input
              type="text"
              placeholder="Buscar evento, autor ou delivery ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="select-chip"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              <option value="all">Todos os eventos</option>
              <option value="push">push</option>
              <option value="pull_request">pull_request</option>
              <option value="member">member</option>
            </select>

            <select
              className="select-chip"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="processing">Processando</option>
              <option value="processed">Processado</option>
              <option value="failed">Falhou</option>
              {showOperationalIdeation && <option value="202 Accepted">202 Accepted (ideação)</option>}
            </select>

            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              {filteredEvents.length} evento(s) exibido(s)
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="module-table">
            <thead>
              <tr>
                <th>EVENTO</th>
                <th>X-GITHUB-DELIVERY ID</th>
                <th>AUTOR</th>
                <th>TIMESTAMP</th>
                <th>FORCE PUSH</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((item) => (
                <tr
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspecionar entrega ${item.deliveryId}`}
                  onClick={() => openDrawer(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openDrawer(item)
                    }
                  }}
                >
                  <td>
                    <span className="badge badge-info">{item.event}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {item.deliveryId}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                      {item.author || 'Não exposto pela API'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)' }}>{item.timestamp}</td>
                  <td>
                    {item.forcePush === null ? (
                      <span style={{ color: 'var(--text-dim)' }}>Não informado</span>
                    ) : item.forcePush ? (
                      <span className="badge badge-warning">Sim</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>Não</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${deliveryStatusBadge(item.status)}`}>
                      ● {deliveryStatusLabel(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 28 }}>
                    Nenhum evento corresponde aos filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GAVETA LATERAL DE INSPEÇÃO (DRAWER DA SCREEN 09) */}
      {drawerOpen && selectedEvent && (
        <aside className="inspector-drawer">
          <div className="drawer-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 14 }}>Inspeção da entrega</span>
                <span className={`badge ${deliveryStatusBadge(selectedEvent.status)}`}>
                  ● {deliveryStatusLabel(selectedEvent.status)}
                </span>
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {selectedEvent.deliveryId}
              </span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Fechar detalhes da entrega"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="drawer-content">
            {/* Bloco: Evento Selecionado */}
            <div
              style={{
                backgroundColor: 'var(--bg-card-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>Evento selecionado</span>
                <span className="badge badge-info">{selectedEvent.event}</span>
              </div>

              <div className="responsive-grid-three" style={{ gap: 8, fontSize: 11 }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>AUTOR</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                    {selectedEvent.author || 'Não exposto'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>BRANCH</span>
                  <span style={{ color: 'var(--info)' }}>{selectedEvent.branch}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>RECEBIDO</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedEvent.timestamp}</span>
                </div>
              </div>

              <div style={{ fontSize: 11, color: selectedEvent.isDemo ? '#FBBF24' : '#34D399', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={12} />
                <span>
                  {selectedEvent.isDemo
                    ? 'Amostra visual: dados não persistidos'
                    : 'Assinatura HMAC-SHA256 validada antes da persistência'}
                </span>
              </div>
            </div>

            <div className="module-card" style={{ margin: 0 }}>
              <div className="module-card-title">Dados persistidos da entrega</div>
              <div className="responsive-grid-two" style={{ gap: 12, marginTop: 12, fontSize: 11 }}>
                <div><span style={{ color: 'var(--text-tertiary)', display: 'block' }}>TENTATIVAS</span>{selectedEvent.attempts ?? 'Não informado'}</div>
                <div><span style={{ color: 'var(--text-tertiary)', display: 'block' }}>COMMITS</span>{selectedEvent.commitsCount ?? 'Não informado'}</div>
                <div><span style={{ color: 'var(--text-tertiary)', display: 'block' }}>RECEBIDO EM</span>{selectedEvent.receivedAt ? new Date(selectedEvent.receivedAt).toLocaleString('pt-BR') : 'Não informado'}</div>
                <div><span style={{ color: 'var(--text-tertiary)', display: 'block' }}>PROCESSADO EM</span>{selectedEvent.processedAt ? new Date(selectedEvent.processedAt).toLocaleString('pt-BR') : 'Ainda não concluído'}</div>
              </div>
              {selectedEvent.error && (
                <div style={{ color: '#FCA5A5', marginTop: 12, fontSize: 11 }}>
                  <strong>Erro:</strong> {selectedEvent.error}
                </div>
              )}
            </div>

            {/* Resumo do contrato disponível */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-default)', paddingBottom: 6 }}>
                <button
                  onClick={() => setActiveJsonTab('payload')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: activeJsonTab === 'payload' ? '#60A5FA' : 'var(--text-tertiary)',
                    fontWeight: 600,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Resumo da API
                </button>
                <button
                  onClick={() => setActiveJsonTab('headers')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: activeJsonTab === 'headers' ? '#60A5FA' : 'var(--text-tertiary)',
                    fontWeight: 600,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Headers disponíveis
                </button>
              </div>

              <div className="code-box-dark">
                {activeJsonTab === 'payload' ? (
                  <pre>{JSON.stringify({
                    delivery_id: selectedEvent.deliveryId,
                    event: selectedEvent.event,
                    repository: repository?.full_name || null,
                    ref: selectedEvent.branch === 'Não informado' ? null : `refs/heads/${selectedEvent.branch}`,
                    status: selectedEvent.status,
                    attempts: selectedEvent.attempts ?? null,
                    commits_count: selectedEvent.commitsCount ?? null,
                    received_at: selectedEvent.receivedAt || null,
                    processed_at: selectedEvent.processedAt || null,
                    error: selectedEvent.error || null,
                    notice: selectedEvent.isDemo
                      ? 'Amostra visual da ideação; não persistida.'
                      : 'Resumo montado com campos expostos pela API; o payload bruto não é retornado.',
                  }, null, 2)}</pre>
                ) : (
                  <pre>{`X-GitHub-Delivery: ${selectedEvent.deliveryId}
X-GitHub-Event: ${selectedEvent.event}
X-Hub-Signature-256: validada no recebimento; valor não exposto

Os demais headers originais não são persistidos pelo contrato atual.`}</pre>
                )}
              </div>
            </div>

            {/* Card de Estado Atual */}
            <div
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 8,
                padding: 12,
                fontSize: 11,
                color: 'var(--info)',
                lineHeight: 1.4,
              }}
            >
              ℹ️ <strong>Estado atual: {deliveryStatusLabel(selectedEvent.status)}</strong>
              <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                {deliveryStatusDescription(selectedEvent)}
              </p>
            </div>

            {/* Ações do Drawer */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                className="btn-module btn-module-primary"
                style={{ flex: 1 }}
                disabled
                title="O trace distribuído ainda não é fornecido por este módulo."
              >
                <ExternalLink size={12} />
                <span>Trace em desenvolvimento</span>
              </button>
              <button
                className="btn-module btn-module-secondary"
                style={{ flex: 1 }}
                disabled
                title="A consulta de logs centralizados ainda não é fornecida por este módulo."
              >
                <Terminal size={12} />
                <span>Logs em desenvolvimento</span>
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
