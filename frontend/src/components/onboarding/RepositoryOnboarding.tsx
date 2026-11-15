import React from 'react'
import { CheckCircle2, ChevronRight, CircleDotDashed, GitPullRequest, Radio, RefreshCw } from 'lucide-react'
import type { Delivery, Repository } from '../../api'

interface RepositoryOnboardingProps {
  repository: Repository | null
  commitsCount: number
  deliveries: Delivery[]
  syncing: boolean
  onConnectRepository: () => void
  onSyncRepository: () => void
  onOpenWebhooks: () => void
  onOpenAnalytics: () => void
}

type Step = {
  id: string
  title: string
  description: string
  done: boolean
  action: string
  onClick: () => void
  icon: React.ReactNode
}

/** A real first-use checklist: every action changes workspace state or opens a real tab. */
export const RepositoryOnboarding: React.FC<RepositoryOnboardingProps> = ({
  repository,
  commitsCount,
  deliveries,
  syncing,
  onConnectRepository,
  onSyncRepository,
  onOpenWebhooks,
  onOpenAnalytics,
}) => {
  const hasRepository = Boolean(repository)
  const hasCommits = commitsCount > 0
  const hasDelivery = deliveries.length > 0
  const complete = [hasRepository, hasCommits, hasDelivery].filter(Boolean).length

  const steps: Step[] = [
    {
      id: 'repository',
      title: 'Conecte um repositório',
      description: hasRepository
        ? `${repository?.full_name} está vinculado ao projeto.`
        : 'Informe a URL do GitHub e um segredo exclusivo para o webhook.',
      done: hasRepository,
      action: hasRepository ? 'Revisar conexão' : 'Conectar repositório',
      onClick: onConnectRepository,
      icon: <GitPullRequest size={16} />,
    },
    {
      id: 'sync',
      title: 'Sincronize os dados iniciais',
      description: hasCommits
        ? `${commitsCount} commit${commitsCount === 1 ? '' : 's'} indexado${commitsCount === 1 ? '' : 's'} para consulta.`
        : 'Busque commits, branches e pull requests do repositório conectado.',
      done: hasCommits,
      action: syncing ? 'Sincronizando…' : 'Sincronizar agora',
      onClick: onSyncRepository,
      icon: <RefreshCw size={16} className={syncing ? 'animate-spin' : undefined} />,
    },
    {
      id: 'webhook',
      title: 'Valide o recebimento do webhook',
      description: hasDelivery
        ? `${deliveries.length} entrega${deliveries.length === 1 ? '' : 's'} persistida${deliveries.length === 1 ? '' : 's'} para este repositório.`
        : 'No GitHub, configure a URL e o mesmo segredo exibido ao conectar o repositório.',
      done: hasDelivery,
      action: 'Abrir monitor de webhooks',
      onClick: onOpenWebhooks,
      icon: <Radio size={16} />,
    },
  ]

  return (
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <div className="onboarding-card-header">
        <div>
          <span className="onboarding-eyebrow">PRIMEIRO USO</span>
          <h2 id="onboarding-title">Prepare este projeto para acompanhar o GitHub</h2>
          <p>Complete os passos abaixo uma vez para cada repositório. Nenhuma ação cria ou altera dados no GitHub sem sua confirmação.</p>
        </div>
        <div className="onboarding-progress" aria-label={`${complete} de 3 etapas concluídas`}>
          <strong>{complete}/3</strong>
          <span>etapas concluídas</span>
        </div>
      </div>

      <ol className="onboarding-steps">
        {steps.map((step, index) => (
          <li className={`onboarding-step ${step.done ? 'is-done' : ''}`} key={step.id}>
            <div className="onboarding-step-index" aria-hidden="true">
              {step.done ? <CheckCircle2 size={18} /> : <span>{index + 1}</span>}
            </div>
            <div className="onboarding-step-copy">
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
            <button
              type="button"
              className="btn-module btn-module-secondary btn-module-sm"
              onClick={step.onClick}
              disabled={step.id === 'sync' && (!repository || syncing)}
            >
              {step.icon} {step.action}<ChevronRight size={13} />
            </button>
          </li>
        ))}
      </ol>

      {hasCommits && (
        <div className="onboarding-insights">
          <CircleDotDashed size={15} />
          <span>Dados disponíveis. Use os insights do fluxo Git para revisar padrões já indexados.</span>
          <button type="button" className="link-button" onClick={onOpenAnalytics}>Abrir insights</button>
        </div>
      )}
    </section>
  )
}
