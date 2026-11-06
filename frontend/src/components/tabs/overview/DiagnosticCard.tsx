import React from 'react'
import { PlugZap } from 'lucide-react'

interface DiagnosticCardProps {
  latencyMs?: number
  onTestConnection?: () => void
  testing?: boolean
}

export const DiagnosticCard: React.FC<DiagnosticCardProps> = ({
  latencyMs = 42,
  onTestConnection,
  testing = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>Diagnóstico rápido</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>tempo real</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>GitHub API</span>
            <strong style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>
              {latencyMs} ms
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Entrega do webhook</span>
            <strong style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>2,1 s</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Fila de eventos</span>
            <strong style={{ color: '#F59E0B', fontFamily: 'var(--font-mono)' }}>3 pendentes</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-module btn-module-secondary btn-module-sm"
          style={{ flex: 1 }}
          onClick={onTestConnection}
          disabled={testing}
        >
          <PlugZap size={12} />
          <span>{testing ? 'Testando...' : 'Testar conexão'}</span>
        </button>
      </div>
    </div>
  )
}
