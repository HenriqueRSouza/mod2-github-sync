import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { api, type Repository } from '../api'

interface ConnectRepoModalProps {
  isOpen: boolean
  projectId: string | null
  onClose: () => void
  onSuccess: (repo: Repository, token?: string) => void
}

export const ConnectRepoModal: React.FC<ConnectRepoModalProps> = ({ isOpen, projectId, onClose, onSuccess }) => {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const resetAndClose = useCallback(() => {
    setUrl('')
    setToken('')
    setWebhookSecret('')
    setError(null)
    setLoading(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) resetAndClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, loading, resetAndClose])

  if (!isOpen) return null

  // Validação em tempo real se é URL válida do GitHub
  const isValidGitHubUrl = (input: string): boolean => {
    try {
      const parsed = new URL(input.trim())
      return (
        (parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com') &&
        parsed.pathname.split('/').filter(Boolean).length >= 2
      )
    } catch {
      return false
    }
  }

  const isInvalidUrl = url.trim().length > 0 && !isValidGitHubUrl(url)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUrl = url.trim()

    if (!cleanUrl) {
      setError('Por favor, cole a URL do repositório do GitHub.')
      return
    }

    if (!projectId) {
      setError('Selecione ou crie um projeto antes de conectar o repositório.')
      return
    }

    if (!isValidGitHubUrl(cleanUrl)) {
      setError('A URL informada deve pertencer obrigatoriamente ao domínio github.com (ex: https://github.com/owner/repo).')
      return
    }

    if (webhookSecret.trim().length < 16) {
      setError('Informe um segredo de webhook com pelo menos 16 caracteres.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { status, data } = await api.createRepository({
        project_id: projectId,
        url: cleanUrl,
        token: token.trim() || undefined,
        webhook_secret: webhookSecret.trim(),
      })

      if (status === 201) {
        onSuccess(data, token.trim() || undefined)
        resetAndClose()
      } else {
        const response = data as { code?: string; detail?: string; url?: string | string[] }
        const detail = response.detail || response.url || 'Falha ao conectar o repositório.'
        if (status === 429 || response.code === 'github_rate_limit_exceeded') {
          setError('O limite de consultas públicas do GitHub foi atingido. Informe um PAT com acesso ao repositório ou tente novamente mais tarde.')
        } else if (status === 403 && !token.trim()) {
          setError('O GitHub recusou o acesso. Se o repositório for privado ou o limite público tiver sido atingido, informe um PAT com acesso de leitura.')
        } else if (status === 500) {
          setError('A integração do Módulo 2 apresentou uma falha interna ao processar o repositório. A URL e o PAT não são expostos; tente novamente e, se persistir, reporte o horário do erro para verificarmos os logs do serviço.')
        } else if (status >= 500 || (typeof detail === 'string' && detail.trim().startsWith('<'))) {
          setError('O serviço de integração está temporariamente indisponível. Tente novamente em alguns instantes; se persistir, a equipe deve verificar as variáveis seguras do backend.')
        } else {
          setError(Array.isArray(detail) ? detail.join(' ') : String(detail))
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro de rede ao conectar repositório.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => { if (!loading) resetAndClose() }}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-repository-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'var(--primary-subtle)',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              {/* GitHub SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>
            <div>
              <h3 id="connect-repository-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Conectar Repositório GitHub</h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                Cole o link direto do repositório no GitHub para ingestão e rastreabilidade.
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            aria-label="Fechar conexão de repositório"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Link do Repositório (GitHub)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://github.com/organizacao/repositorio"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              required
              autoFocus
            />
            {isInvalidUrl ? (
              <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <AlertCircle size={12} /> Apenas links válidos do github.com são aceitos.
              </span>
            ) : url.trim().length > 0 ? (
              <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <CheckCircle2 size={12} /> Formato válido. O acesso será confirmado ao conectar.
              </span>
            ) : (
              <span className="form-help">
                Exemplo: https://github.com/facebook/react ou https://github.com/owner/repository
              </span>
            )}
          </div>

          <div>
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <KeyRound size={12} /> Segredo do webhook
              </span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Use um segredo forte e exclusivo deste repositório"
              value={webhookSecret}
              onChange={(e) => {
                setWebhookSecret(e.target.value)
                setError(null)
              }}
              minLength={16}
              required
            />
            <span className="form-help">
              Protege os eventos recebidos: o GitHub assina cada payload e o Módulo 2 valida a assinatura antes de indexar commits. Configure o mesmo valor no webhook do GitHub; ele será cifrado no servidor e não será devolvido pela API.
            </span>
          </div>

          <div>
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <KeyRound size={12} /> Personal Access Token (PAT) — Opcional
              </span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="ghp_************************************"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <span className="form-help">
              Use para repositórios privados ou quando o limite público do GitHub for atingido. O token não é exibido nem devolvido pela API.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={resetAndClose}
              disabled={loading}
              className="btn-module btn-module-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !projectId || isInvalidUrl || !url.trim() || webhookSecret.trim().length < 16}
              className="btn-module btn-module-primary"
            >
              {loading ? 'Conectando & Sincronizando...' : 'Conectar Repositório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
