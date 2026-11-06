import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  Terminal,
  FileCode2,
  ExternalLink,
} from 'lucide-react'

export interface InspectorItem {
  id: string
  title?: string
  status: 'Sucesso' | 'Falha' | 'Cancelada' | 'Processando'
  commit?: string
  branch?: string
  author?: string
  authorInitials?: string
  duration?: string
  when?: string
  executionId?: string
  event?: string
  url?: string
  payload?: Record<string, unknown> | null
  logs?: string[]
}

interface InspectorDrawerProps {
  item: InspectorItem | null
  onClose: () => void
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState<'payload' | 'logs' | 'curl'>('payload')
  const [copied, setCopied] = useState(false)

  if (!item) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sucesso':
        return <span className="badge badge-success">● Sucesso</span>
      case 'Falha':
        return <span className="badge badge-danger">● Falha</span>
      default:
        return <span className="badge badge-neutral">{status}</span>
    }
  }

  const jsonPayload = item.payload || {
    id: item.id,
    execution_id: item.executionId || null,
    title: item.title || null,
    status: item.status,
    commit: item.commit || null,
    branch: item.branch || null,
    author: item.author || null,
    observed_at: item.when || null,
    notice: 'Resumo montado no navegador; o payload bruto não está disponível neste endpoint.',
  }

  const logs = item.logs?.length
    ? item.logs
    : ['Nenhum registro de execução foi anexado a este item pela API.']

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 90,
        }}
      />

      {/* Drawer Panel */}
      <aside
        className="inspector-drawer"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '540px',
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-card-secondary)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header do Drawer */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                INSPETOR DE EXECUÇÃO
              </span>
              {getStatusBadge(item.status)}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {item.executionId || item.id.slice(0, 10)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>branch: <strong style={{ color: 'var(--text-main)' }}>{item.branch || 'Não informada'}</strong></span>
              <span>•</span>
              <span>autor: <strong style={{ color: 'var(--text-main)' }}>{item.author || 'Não informado'}</strong></span>
              {item.when && (
                <>
                  <span>•</span>
                  <span>{item.when}</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
            title="Fechar Inspetor (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas do Inspetor */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-app)',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => setActiveTab('payload')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payload' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'payload' ? '#60A5FA' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileCode2 size={14} />
            <span>Resumo JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'logs' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'logs' ? '#60A5FA' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Terminal size={14} />
            <span>Registros</span>
          </button>

          <button
            onClick={() => setActiveTab('curl')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'curl' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'curl' ? '#60A5FA' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Replay</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {activeTab === 'payload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dados disponibilizados para este item:</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(jsonPayload, null, 2))}
                  className="btn-module btn-module-secondary btn-module-sm"
                >
                  {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
              </div>

              <pre
                style={{
                  backgroundColor: 'var(--bg-code)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  padding: 16,
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--info)',
                  overflowX: 'auto',
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(jsonPayload, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Registros disponibilizados pela API:</span>
                <span className="badge badge-info">Sem stream em tempo real</span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-code)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  padding: 14,
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {logs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      color: log.includes('[ERROR]') ? '#EF4444' : log.includes('[SUCCESS]') ? '#10B981' : '#94A3B8',
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'curl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reprodução local:</span>

              <pre
                style={{
                  backgroundColor: 'var(--bg-code)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  padding: 16,
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono)',
                  color: '#FBBF24',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                Replay indisponível: o payload bruto e a assinatura não são expostos por este endpoint.
              </pre>
            </div>
          )}
        </div>

        {/* Footer do Drawer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <FileCode2 size={14} color="#60A5FA" />
            <span>Dados exibidos conforme o contrato atual da API</span>
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="btn-module btn-module-secondary btn-module-sm"
              style={{ textDecoration: 'none' }}
            >
              <span>Ver no GitHub</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </aside>
    </>
  )
}
