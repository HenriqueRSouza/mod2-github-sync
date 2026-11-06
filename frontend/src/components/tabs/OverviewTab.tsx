import React, { useState } from 'react'
import type { Commit, ConnectivityStatus, FlowMetrics, Repository } from '../../api'
import { OverviewKpis } from './overview/OverviewKpis'
import { PipelineStepper } from './overview/PipelineStepper'
import { DiagnosticCard } from './overview/DiagnosticCard'
import { ExecutionsTable } from './overview/ExecutionsTable'
import { InspectorDrawer, type InspectorItem } from '../common/InspectorDrawer'

interface OverviewTabProps {
  commits: Commit[]
  connectivity: ConnectivityStatus | null
  flow: FlowMetrics | null
  selectedRepo: Repository | null
  onSyncNow: () => void
  syncing: boolean
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  commits,
  connectivity,
  flow,
  selectedRepo,
  onSyncNow,
  syncing,
}) => {
  const [inspectedItem, setInspectedItem] = useState<InspectorItem | null>(null)
  const showIdeation = false

  const totalCommits = flow?.total_commits ?? commits.length

  return (
    <div className="tab-pane-container">
      {/* 4 KPIs de Topo */}
      <OverviewKpis
        totalCommits={totalCommits}
        latencyMs={connectivity?.latency_ms}
        connectivityStatus={connectivity?.status}
        showIdeation={showIdeation}
      />

      {/* Bloco: Atividade e saúde da integração (2 Colunas) */}
      {showIdeation && <div className="module-card">
        <div className="module-card-header">
          <div>
            <div className="module-card-title">
              Atividade e saúde da integração
              <span className="badge badge-success" style={{ marginLeft: 6 }}>
                ● Operacional
              </span>
            </div>
            <div className="module-card-subtitle">
              Pipeline de execução mais recente e verificações dos serviços dependentes.
            </div>
          </div>
        </div>

        <div className="responsive-grid-overview">
          {/* Coluna Esquerda: Pipeline Horizontal Stepper */}
          <PipelineStepper
            pipelineId={commits.length > 0 ? `sync_${commits[0].sha.slice(0, 8).toUpperCase()}` : 'sync_01JBQ9A7'}
            status="Concluída"
            duration="2m 14s"
            throughput="135 obj/min"
          />

          {/* Coluna Direita: Diagnóstico Rápido */}
          <DiagnosticCard
            latencyMs={connectivity?.latency_ms ?? 42}
            onTestConnection={onSyncNow}
            testing={syncing}
          />
        </div>
      </div>}

      {/* Tabela de Execuções e Commits Reais */}
      <ExecutionsTable
        commits={commits}
        onSelectExecution={(item) => setInspectedItem(item)}
        onSyncNow={onSyncNow}
        syncing={syncing}
        repoName={selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : undefined}
      />

      {/* Inspetor Lateral de Execuções */}
      <InspectorDrawer
        item={inspectedItem}
        onClose={() => setInspectedItem(null)}
      />
    </div>
  )
}
