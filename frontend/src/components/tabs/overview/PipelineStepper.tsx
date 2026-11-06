import React from 'react'
import { CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react'

interface PipelineStepperProps {
  pipelineId?: string
  status?: string
  duration?: string
  throughput?: string
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  pipelineId = 'sync_01JBQ9A7',
  status = 'Concluída',
  duration = '2m 18s',
  throughput = '135 obj/min',
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
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>
            Pipeline • {pipelineId}
          </span>
          <span className="badge badge-success">{status}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Duração total {duration}</span>
      </div>

      {/* Etapas do Pipeline */}
      <div className="pipeline-stages-row">
        <div className="pipeline-stage-step">
          <div className="stage-step-icon success">
            <CheckCircle2 size={14} />
          </div>
          <div className="stage-step-info">
            <span className="stage-step-name">Webhook</span>
            <span className="stage-step-time">Recebido • 84 ms</span>
          </div>
        </div>

        <ChevronRight size={14} className="stage-arrow" />

        <div className="pipeline-stage-step">
          <div className="stage-step-icon success">
            <CheckCircle2 size={14} />
          </div>
          <div className="stage-step-info">
            <span className="stage-step-name">Validação</span>
            <span className="stage-step-time">Assinatura válida</span>
          </div>
        </div>

        <ChevronRight size={14} className="stage-arrow" />

        <div className="pipeline-stage-step">
          <div className="stage-step-icon success">
            <CheckCircle2 size={14} />
          </div>
          <div className="stage-step-info">
            <span className="stage-step-name">Descoberta</span>
            <span className="stage-step-time">23 alterações</span>
          </div>
        </div>

        <ChevronRight size={14} className="stage-arrow" />

        <div className="pipeline-stage-step">
          <div className="stage-step-icon success">
            <CheckCircle2 size={14} />
          </div>
          <div className="stage-step-info">
            <span className="stage-step-name">Indexação</span>
            <span className="stage-step-time">312 objetos</span>
          </div>
        </div>

        <ChevronRight size={14} className="stage-arrow" />

        <div className="pipeline-stage-step">
          <div className="stage-step-icon warning">
            <AlertTriangle size={14} />
          </div>
          <div className="stage-step-info">
            <span className="stage-step-name">Reconciliação</span>
            <span className="stage-step-time" style={{ color: '#F59E0B' }}>
              1 aviso ignorado
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Throughput */}
      <div className="throughput-bar-wrap">
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Throughput</span>
        <div className="throughput-track">
          <div className="throughput-fill" style={{ width: '74%' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399', fontFamily: 'var(--font-mono)' }}>
          {throughput}
        </span>
      </div>
    </div>
  )
}
