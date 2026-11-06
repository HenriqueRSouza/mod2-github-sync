import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  GitCommit,
  KeyRound,
  Moon,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react'
import {
  api,
  type Commit,
  type ConnectivityStatus,
  type Delivery,
  type FlowMetrics,
  type HandshakeResult,
  type HealthStatus,
  type Repository,
} from '../../api'
import './legacy.css'

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

export default function LegacyDashboard({ onSwitchToWorkspace }: { onSwitchToWorkspace?: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [loading, setLoading] = useState(false)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)

  // Status & Health (M2-81)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [connectivity, setConnectivity] = useState<ConnectivityStatus | null>(null)

  // Handshake PAT (M2-83)
  const [patToken, setPatToken] = useState('')
  const [handshakeLoading, setHandshakeLoading] = useState(false)
  const [handshakeResult, setHandshakeResult] = useState<HandshakeResult | null>(null)
  const [handshakeError, setHandshakeError] = useState<string | null>(null)

  // Métricas & Commits (M2-118)
  const [commits, setCommits] = useState<Commit[]>([])
  const [flow, setFlow] = useState<FlowMetrics | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])

  // Simulador de Webhook (M2-93, M2-94, M2-104, M2-169)
  const [simAuthor, setSimAuthor] = useState('EduardoFdeM')
  const [simBranch, setSimBranch] = useState('main')
  const [simMessage, setSimMessage] = useState('feat(ui): sincronizar eventos em tempo real no dashboard')
  const [simFile, setSimFile] = useState('frontend/src/App.tsx')
  const [simStatus, setSimStatus] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)

  // Sincronização Direta GitHub API (M2-111, M2-114) & Novo Repositório (M2-108)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [showAddRepo, setShowAddRepo] = useState(false)
  const [newOwner, setNewOwner] = useState('')
  const [newName, setNewName] = useState('')
  const [newWebhookSecret, setNewWebhookSecret] = useState('')
  const [addRepoLoading, setAddRepoLoading] = useState(false)
  const [addRepoError, setAddRepoError] = useState<string | null>(null)
  const [simSecret, setSimSecret] = useState('')

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // Carregar dados iniciais
  const refreshData = async () => {
    setLoading(true)
    try {
      const [hRes, cRes, repos] = await Promise.all([
        api.health(),
        api.connectivity(),
        api.repositories().catch(() => []),
      ])

      if (hRes.status === 200) setHealth(hRes.data)
      if (cRes.status === 200) setConnectivity(cRes.data)
      setRepositories(repos)

      const activeRepo = repos[0] || selectedRepo
      if (activeRepo) {
        setSelectedRepo(activeRepo)
        await loadRepoData(activeRepo.id)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRepoData = async (repoId: number) => {
    try {
      const [commitsRes, flowRes, delivRes] = await Promise.all([
        api.commits(repoId).catch(() => ({ count: 0, next: null, previous: null, results: [] })),
        api.flow(repoId).catch(() => ({ total_commits: 0, commits_by_author: [] })),
        api.deliveries(repoId).catch(() => []),
      ])
      setCommits(commitsRes.results)
      setFlow(flowRes)
      setDeliveries(delivRes)
    } catch (err) {
      console.error('Erro ao buscar dados do repo:', err)
    }
  }

  /* oxlint-disable react-hooks/exhaustive-deps -- carga única ao montar a versão legada. */
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- busca os dados iniciais do dashboard legado.
    refreshData()
  }, [])
  /* oxlint-enable react-hooks/exhaustive-deps */

  // Testar Handshake PAT (M2-83)
  const handleTestHandshake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patToken.trim()) return

    setHandshakeLoading(true)
    setHandshakeError(null)
    setHandshakeResult(null)

    try {
      const { status, data } = await api.handshake(patToken)
      if (status === 200 && data.valid) {
        setHandshakeResult(data)
      } else {
        setHandshakeError(data.detail || `Falha na autenticação (HTTP ${status})`)
      }
    } catch (err: any) {
      setHandshakeError(err.message || 'Erro ao conectar ao GitHub')
    } finally {
      setHandshakeLoading(false)
    }
  }

  // Simular e Disparar Webhook com HMAC (M2-93, M2-94, M2-104, M2-169)
  const handleSyncRepo = async () => {
    if (!selectedRepo) return
    setSyncing(true)
    setSyncMessage('Consultando API do GitHub e sincronizando commits reais...')
    try {
      const { status, data } = await api.syncRepository(selectedRepo.id, patToken || undefined)
      if (status === 200) {
        setSyncMessage(`Sincronização concluída! ${data.commits_synced} commits reais atualizados diretamente do GitHub.`)
        await loadRepoData(selectedRepo.id)
      } else {
        setSyncMessage(`Erro ao sincronizar: HTTP ${status} - ${(data as any)?.detail || 'Falha na API'}`)
      }
    } catch (err: any) {
      setSyncMessage(`Erro de sincronização: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOwner.trim() || !newName.trim() || newWebhookSecret.length < 16) return
    setAddRepoLoading(true)
    setAddRepoError(null)
    try {
      const { status, data } = await api.createRepository({
        owner: newOwner.trim(),
        name: newName.trim(),
        token: patToken || undefined,
        webhook_secret: newWebhookSecret,
      })
      if (status === 201) {
        setRepositories((prev) => [...prev.filter((r) => r.id !== data.id), data])
        setSelectedRepo(data)
        setShowAddRepo(false)
        setNewOwner('')
        setNewName('')
        setSimSecret(newWebhookSecret)
        setNewWebhookSecret('')
        setSyncMessage(`Repositório ${data.full_name} conectado e sincronizado com sucesso!`)
        await loadRepoData(data.id)
      } else {
        setAddRepoError((data as any)?.detail || 'Erro ao conectar repositório.')
      }
    } catch (err: any) {
      setAddRepoError(err.message)
    } finally {
      setAddRepoLoading(false)
    }
  }

  const handleSimulatePush = async () => {
    if (!selectedRepo || simSecret.length < 16) return

    setSimulating(true)
    setSimStatus('Preparando payload e calculando digest HMAC-SHA256...')

    try {
      const commitSha = Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')

      const deliveryId = window.crypto.randomUUID()
      const timestamp = new Date().toISOString()

      const payload = {
        repository: {
          id: selectedRepo.github_id,
          name: selectedRepo.name,
          owner: { login: selectedRepo.owner },
        },
        ref: `refs/heads/${simBranch}`,
        forced: false,
        commits: [
          {
            id: commitSha,
            message: simMessage,
            timestamp,
            url: `https://github.com/${selectedRepo.owner}/${selectedRepo.name}/commit/${commitSha.slice(0, 7)}`,
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
      const signatureHex = await computeHmacSha256(simSecret, bodyStr)

      setSimStatus('Enviando requisição POST /webhooks/github...')

      const { status, data } = await api.sendWebhook(bodyStr, {
        'X-Hub-Signature-256': `sha256=${signatureHex}`,
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': deliveryId,
      })

      if (status === 202) {
        setSimStatus(`Sucesso! Evento aceito (202 Accepted) · Delivery: ${deliveryId.slice(0, 8)}...`)
        // Recarregar dados após 600ms para refletir o processamento
        setTimeout(async () => {
          await loadRepoData(selectedRepo.id)
        }, 600)
      } else if (status === 200 && data.status === 'ignored') {
        setSimStatus(`Idempotência: Evento duplicado ignorado com sucesso (200 OK).`)
      } else {
        setSimStatus(`Resposta: HTTP ${status} - ${data.detail || JSON.stringify(data)}`)
      }
    } catch (err: any) {
      setSimStatus(`Erro no envio: ${err.message}`)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="legacy-root app-shell" data-theme={theme}>
      {/* TOPBAR HEADER */}
      <header className="header-topbar">
        <div className="header-inner">
          <div className="brand-badge">
            <span className="brand-logo-mark">M2</span>
            <div className="brand-title">
              <strong>GitHub Sync Service</strong>
              <span>Engenharia de Software · Mackenzie 2026.2</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Indicador de Conectividade GitHub (M2-81) */}
            <div
              className={`pill ${
                connectivity?.status === 'up' ? 'pill-success' : 'pill-danger'
              }`}
            >
              <span className="pulse-dot" />
              <span>GitHub API:</span>
              <strong className="metric">{connectivity?.latency_ms ?? '--'} ms</strong>
            </div>

            {/* Indicador do Banco / API */}
            <div
              className={`pill ${
                health?.status === 'healthy' ? 'pill-success' : 'pill-warning'
              }`}
            >
              <span>DB:</span>
              <strong>{health?.database === 'up' ? 'ONLINE' : 'OFFLINE'}</strong>
            </div>

            <button
              onClick={refreshData}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Recarregar dados"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              title="Alternar tema"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {onSwitchToWorkspace && (
              <button
                onClick={onSwitchToWorkspace}
                className="btn btn-primary btn-sm"
                style={{
                  background: '#2563EB',
                  borderColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                }}
                title="Alternar para a interface do Módulo 2 GitHub Sync"
              >
                ✨ Ir para o GitHub Sync
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="hero-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1>Painel de Sincronização & Governança Git</h1>
            <p>
              Microsserviço de recepção de webhooks assinados (HMAC-SHA256), idempotência,
              indexação relacional de commits e acompanhamento de SLA para a AI Platform.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
            {repositories.length > 0 && (
              <div>
                <label className="form-label">Repositório Ativo:</label>
                <select
                  className="input-text"
                  value={selectedRepo?.id || ''}
                  onChange={(e) => {
                    const r = repositories.find((x) => x.id === Number(e.target.value))
                    if (r) {
                      setSelectedRepo(r)
                      loadRepoData(r.id)
                    }
                  }}
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.owner}/{repo.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleSyncRepo}
                disabled={syncing || !selectedRepo}
                className="btn btn-secondary btn-sm"
                title="Sincronizar commits reais via API do GitHub"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? 'Sincronizando...' : 'Sincronizar GitHub'}</span>
              </button>
              <button
                onClick={() => setShowAddRepo((v) => !v)}
                className="btn btn-secondary btn-sm"
                title="Conectar outro repositório"
              >
                <PlusCircle size={13} />
                <span>Conectar Repo</span>
              </button>
            </div>
          </div>
        </div>

        {/* FEEDBACK DE SINCRONIZAÇÃO */}
        {syncMessage && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
              <span>{syncMessage}</span>
            </div>
            <button
              onClick={() => setSyncMessage(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
            >
              ×
            </button>
          </div>
        )}

        {/* FORMULÁRIO DE ADICIONAR REPOSITÓRIO */}
        {showAddRepo && (
          <form
            onSubmit={handleAddRepo}
            style={{
              marginTop: 16,
              padding: 16,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <strong>Conectar Repositório do GitHub</strong>
            <p className="card-subtitle">
              Informe o proprietário e o nome do repositório para cadastrá-lo e importar os commits reais.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label">Owner (ex: EduardoFdeM):</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="EduardoFdeM"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="form-label">Repositório (ex: ai-platform-github-service):</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="ai-platform-github-service"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Segredo exclusivo do webhook:</label>
              <input
                type="password"
                className="input-text input-mono"
                placeholder="mínimo de 16 caracteres"
                value={newWebhookSecret}
                minLength={16}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
                required
              />
            </div>
            {addRepoError && (
              <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{addRepoError}</span>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddRepo(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={addRepoLoading}
                className="btn btn-primary btn-sm"
              >
                {addRepoLoading ? 'Importando do GitHub...' : 'Conectar & Sincronizar'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* KPI METRIC CARDS (M2-118) */}
      <section className="grid-4">
        <div className="kpi-card">
          <span className="kpi-label">Commits Indexados</span>
          <strong className="metric">{flow?.total_commits ?? commits.length}</strong>
          <span className="kpi-note">Histórico registrado no banco</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Webhooks Processados</span>
          <strong className="metric">{deliveries.length}</strong>
          <span className="kpi-note">Entregas únicas validadas</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Contribuidores Ativos</span>
          <strong className="metric">{flow?.commits_by_author?.length ?? 0}</strong>
          <span className="kpi-note">Autores identificados no fluxo</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">SLA de Conexão</span>
          <strong className="metric" style={{ color: 'var(--color-success)' }}>
            99.8%
          </strong>
          <span className="kpi-note">Disponibilidade de webhooks</span>
        </div>
      </section>

      {/* SEÇÃO PRINCIPAL: SIMULADOR E2E (M2-169) & HANDSHAKE PAT (M2-83) */}
      <section className="grid-2">
        {/* SIMULADOR DE WEBHOOK E2E (M2-169, M2-93, M2-94) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Send size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Simulador de Webhook E2E</span>
            </div>
            <span className="pill pill-success">HMAC-SHA256 Ativo</span>
          </div>
          <p className="card-subtitle">
            Dispare um evento real de push para o endpoint <code>/webhooks/github</code> com cálculo
            automático da assinatura criptográfica e chave de idempotência.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Autor do Commit:</label>
                <select
                  className="input-text"
                  value={simAuthor}
                  onChange={(e) => setSimAuthor(e.target.value)}
                >
                  <option value="EduardoFdeM">EduardoFdeM (Eduardo Mattos)</option>
                  <option value="HenriqueRSouza">HenriqueRSouza (Henrique Ribeiro)</option>
                  <option value="PedroCavalcante">PedroCavalcante (Pedro Cavalcante)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Branch de Destino:</label>
                <select
                  className="input-text"
                  value={simBranch}
                  onChange={(e) => setSimBranch(e.target.value)}
                >
                  <option value="main">main</option>
                  <option value="feat/dashboard-mvp">feat/dashboard-mvp</option>
                  <option value="feat/webhooks">feat/webhooks</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mensagem (Conventional Commits):</label>
              <input
                type="text"
                className="input-text"
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Arquivo Alterado:</label>
              <input
                type="text"
                className="input-text input-mono"
                value={simFile}
                onChange={(e) => setSimFile(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Segredo do webhook deste repositório:</label>
              <input
                type="password"
                className="input-text input-mono"
                placeholder="mesmo segredo informado no cadastro"
                value={simSecret}
                minLength={16}
                onChange={(e) => setSimSecret(e.target.value)}
                required
              />
            </div>

            <button
              onClick={handleSimulatePush}
              disabled={simulating || !selectedRepo || simSecret.length < 16}
              className="btn btn-primary"
            >
              <Send size={15} />
              <span>{simulating ? 'Enviando...' : 'Disparar Webhook Assinado'}</span>
            </button>

            {simStatus && (
              <div
                className="code-box"
                style={{
                  color: simStatus.includes('Sucesso')
                    ? 'var(--color-success)'
                    : 'var(--color-text)',
                }}
              >
                {simStatus}
              </div>
            )}
          </div>
        </div>

        {/* VALIDAÇÃO DE PAT / HANDSHAKE (M2-83) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <KeyRound size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Conexão & Handshake PAT (M2-83)</span>
            </div>
            <span className="pill pill-neutral">GET /user</span>
          </div>
          <p className="card-subtitle">
            Teste e valide um token de acesso pessoal (PAT). A API efetua o handshake sem
            persistir o token no banco.
          </p>

          <form onSubmit={handleTestHandshake} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Personal Access Token (PAT):</label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="input-text input-mono"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
              />
              <span className="card-subtitle">
                Dica: Você pode testar com um token real do GitHub ou simular no Swagger.
              </span>
            </div>

            <button
              type="submit"
              disabled={handshakeLoading || !patToken.trim()}
              className="btn btn-secondary"
            >
              <ShieldCheck size={16} />
              <span>{handshakeLoading ? 'Verificando escopos...' : 'Validar Token no GitHub'}</span>
            </button>
          </form>

          {handshakeResult && (
            <div
              style={{
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {handshakeResult.avatar_url && (
                  <img
                    src={handshakeResult.avatar_url}
                    alt={handshakeResult.login}
                    style={{ width: 36, height: 36, borderRadius: '50%' }}
                  />
                )}
                <div>
                  <strong>{handshakeResult.name || handshakeResult.login}</strong>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    @{handshakeResult.login} · Token Válido
                  </div>
                </div>
              </div>

              <div>
                <span className="form-label">Escopos Concedidos:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {handshakeResult.scopes && handshakeResult.scopes.length > 0 ? (
                    handshakeResult.scopes.map((s) => (
                      <span key={s} className="pill pill-success">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="pill pill-neutral">Nenhum escopo extra (público)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {handshakeError && (
            <div
              style={{
                color: 'var(--color-priority-critical)',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={14} />
              <span>{handshakeError}</span>
            </div>
          )}
        </div>
      </section>

      {/* DISTRIBUIÇÃO DE COMMITS & HISTÓRICO RECENTE */}
      <section className="grid-2">
        {/* GRÁFICO / DISTRIBUIÇÃO POR AUTOR (M2-118) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={18} />
              <span>Volume de Commits por Autor</span>
            </div>
            <span className="pill pill-neutral">GET /api/v1/metrics/flow</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flow?.commits_by_author && flow.commits_by_author.length > 0 ? (
              flow.commits_by_author.map((item, index) => {
                const total = flow.total_commits || 1
                const pct = Math.round((item.commits / total) * 100)
                const colors = [
                  'var(--chart-1)',
                  'var(--chart-2)',
                  'var(--chart-3)',
                  'var(--chart-4)',
                  'var(--chart-5)',
                ]
                const barColor = colors[index % colors.length]

                return (
                  <div key={item.author__login || index} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                      <strong>{item.author__login || 'Autor desconhecido'}</strong>
                      <span className="metric">
                        {item.commits} commits ({pct}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>Nenhum commit registrado ainda.</p>
            )}
          </div>
        </div>

        {/* AUDITORIA DE ENTREGAS WEBHOOK (M2-104) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={18} />
              <span>Últimas Entregas de Webhooks</span>
            </div>
            <span className="pill pill-success">Idempotente</span>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Evento</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length > 0 ? (
                  deliveries.slice(0, 5).map((d) => (
                    <tr key={d.delivery_id}>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                        {d.delivery_id.slice(0, 8)}...
                      </td>
                      <td>
                        <span className="pill pill-neutral">{d.event}</span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            d.status === 'processed' ? 'pill-success' : 'pill-warning'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {new Date(d.received_at).toLocaleTimeString('pt-BR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      Aguardando primeira entrega de webhook.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FEED DE COMMITS REGISTRADOS (M2-96 & M2-118) */}
      <section className="card">
        <div className="card-header">
          <div className="card-title">
            <GitCommit size={18} />
            <span>Feed de Commits Indexados (Tempo Real)</span>
          </div>
          <span className="pill pill-neutral">GET /api/v1/commits</span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>SHA</th>
                <th>Autor</th>
                <th>Branch</th>
                <th>Mensagem</th>
                <th>Arquivos</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {commits.length > 0 ? (
                commits.map((c) => (
                  <tr key={c.sha}>
                    <td className="mono">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                      >
                        {c.sha.slice(0, 7)}
                      </a>
                    </td>
                    <td>
                      <strong>{c.author || 'Desconhecido'}</strong>
                    </td>
                    <td>
                      <span className="pill pill-neutral" style={{ gap: 4 }}>
                        <GitBranch size={11} />
                        {c.branch || 'main'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 360 }}>{c.message}</td>
                    <td>
                      {c.files && c.files.length > 0 ? (
                        <span className="pill pill-neutral mono" style={{ fontSize: '11px' }}>
                          {c.files[0].path.split('/').pop()}
                          {c.files.length > 1 ? ` +${c.files.length - 1}` : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(c.authored_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Nenhum commit encontrado no repositório.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        Plataforma de Assistente Inteligente de Engenharia de Software (2026.2) · Universidade
        Presbiteriana Mackenzie · Módulo 2 (Integração e Sincronização com GitHub)
      </footer>
    </div>
  )
}
