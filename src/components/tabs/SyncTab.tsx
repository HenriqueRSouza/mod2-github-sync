import React, { useState } from 'react'
import {
  RefreshCw,
  Users,
  Search,
  Download,
  UserCheck,
  GitBranch,
  GitPullRequest,
} from 'lucide-react'
import type { Branch, Commit, FlowMetrics, PullRequest, Repository } from '../../api'

interface SyncTabProps {
  repository: Repository | null
  commits: Commit[]
  branches: Branch[]
  pullRequests: PullRequest[]
  flow: FlowMetrics | null
  onSyncNow: () => void
  syncing: boolean
  loading: boolean
  error: string | null
}

export const SyncTab: React.FC<SyncTabProps> = ({
  repository,
  commits,
  branches,
  pullRequests,
  flow,
  onSyncNow,
  syncing,
  loading,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const showIdeation = false

  const totalCommits = flow?.total_commits ?? commits.length

  const students =
    flow?.commits_by_author && flow.commits_by_author.length > 0
      ? flow.commits_by_author.map((item, idx) => ({
          id: String(idx + 1),
          name: item.author__login || 'Autor não identificado',
          course: 'Identidade GitHub indexada',
          ra: item.author__login || 'não informado',
          emails: [] as string[],
          commits: String(item.commits),
          status: 'indexado',
          confidence: 'não calculada',
        }))
      : []


  const filteredStudents = students.filter((s) => {
    const matches =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.emails.some((e) => e.toLowerCase().includes(searchTerm.toLowerCase()))
    return matches && (selectedFilter === 'all' || s.status === selectedFilter)
  })

  const exportContributors = () => {
    const content = JSON.stringify({ repository: repository?.full_name ?? null, contributors: filteredStudents }, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'contribuintes-git-indexados.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="view-container">
      {/* Sub-header da Tela 10 */}
      <div className="section-intro-bar">
        <div>
          <h2 className="section-intro-title">Indexação e sincronização do repositório</h2>
          <p className="section-intro-desc">
            Consulte branches, commits, pull requests e identidades Git persistidos pelo Módulo 2.
          </p>
        </div>

        <button
          onClick={onSyncNow}
          disabled={syncing || !repository}
          className="btn-module btn-module-primary"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          <span>{repository ? 'Sincronizar dados do GitHub' : 'Conecte um repositório para sincronizar'}</span>
        </button>
      </div>

      {loading && (
        <div className="status-pill status-pill-info">Carregando dados indexados do repositório...</div>
      )}
      {error && (
        <div className="status-pill status-pill-danger">{error}</div>
      )}

      {/* 4 KPIs de Sincronização */}
      <div className="kpi-grid-4">
        {showIdeation && <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">ESTADO DA INDEXAÇÃO</span>
            <span className={`badge ${commits.length > 0 ? 'badge-success' : 'badge-info'}`}>
              {commits.length > 0 ? 'Sincronizado' : 'Em curso'}
            </span>
          </div>
          <div className="kpi-value">{commits.length > 0 ? '100%' : '72,4%'}</div>
          <div className="kpi-sub">
            {commits.length > 0 ? 'base de commits sincronizada' : 'carga histórica em curso'}
          </div>
        </div>}

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">COMMITS INDEXADOS</span>
          </div>
          <div className="kpi-value">{totalCommits}</div>
          <div className="kpi-sub">persistidos no banco configurado</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">BRANCHES ATIVAS</span>
            <GitBranch size={14} color="#60A5FA" />
          </div>
          <div className="kpi-value">{branches.length}</div>
          <div className="kpi-sub">retornadas pela API</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">PULL REQUESTS</span>
            <GitPullRequest size={14} color="#A78BFA" />
          </div>
          <div className="kpi-value">{pullRequests.length}</div>
          <div className="kpi-sub">na página atual da API</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">CONTRIBUIDORES REAIS</span>
          </div>
          <div className="kpi-value">{students.length}</div>
          <div className="kpi-sub">autores identificados no git</div>
        </div>

        {showIdeation && <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">PENDÊNCIAS DE VÍNCULO</span>
            <span className="badge badge-success">OK</span>
          </div>
          <div className="kpi-value">0</div>
          <div className="kpi-sub">nenhuma pendência crítica</div>
        </div>}
      </div>

      <div className="module-card">
        <div className="module-card-header">
          <div>
            <div className="module-card-title">Estrutura indexada</div>
            <div className="module-card-subtitle">
              Dados reais dos endpoints de branches e pull requests do repositório selecionado.
            </div>
          </div>
        </div>

        <div className="responsive-grid-sync">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <GitBranch size={14} color="#60A5FA" />
              <strong style={{ fontSize: 12 }}>Branches ativas</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {branches.map((branch) => (
                <div key={branch.id} className="code-box-dark" style={{ padding: '8px 10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{branch.name}</span>
                  {branch.name === repository?.default_branch && (
                    <span className="badge badge-info" style={{ float: 'right' }}>padrão</span>
                  )}
                </div>
              ))}
              {!loading && branches.length === 0 && (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>Nenhuma branch ativa foi retornada.</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <GitPullRequest size={14} color="#A78BFA" />
              <strong style={{ fontSize: 12 }}>Pull requests indexadas</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pullRequests.map((pullRequest) => (
                <div key={pullRequest.id} className="code-box-dark" style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-main)' }}>#{pullRequest.number} {pullRequest.title}</span>
                    <span className={`badge ${pullRequest.merged_at ? 'badge-success' : pullRequest.state === 'open' ? 'badge-info' : 'badge-neutral'}`}>
                      {pullRequest.merged_at ? 'mergeada' : pullRequest.state}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
                    Autor: {pullRequest.author || 'não informado'} · atualizada em {new Date(pullRequest.updated_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
              {!loading && pullRequests.length === 0 && (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>Nenhuma pull request foi retornada.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Carga Inicial & Delta Sync Incremental */}
      {showIdeation && <div className="module-card">
        <div className="module-card-header">
          <div>
            <div className="module-card-title">Carga inicial e estratégia incremental</div>
            <div className="module-card-subtitle">
              Processamento retroativo com paginação resiliente e consultas delta após a conclusão.
            </div>
          </div>
          <span className="badge badge-success">● Worker indexer-07 saudável</span>
        </div>

        <div className="responsive-grid-auth">
          {/* Coluna Esquerda: Importação Histórica */}
          <div
            style={{
              backgroundColor: 'var(--bg-card-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                  Importação histórica de commits e PRs
                </span>
                <span className="badge badge-info">Em execução</span>
              </div>
              <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                ESTIMATIVA RESTANTE 06m 42s
              </span>
            </div>

            {/* Barra de Progresso com Percentual */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Etapa 3 de 4 • importando PRs legados (página 38/52)</span>
                <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>72,4%</strong>
              </div>
              <div className="throughput-track" style={{ height: 6 }}>
                <div className="throughput-fill" style={{ width: '72.4%', background: 'linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)' }} />
              </div>
            </div>

            {/* Grid de 4 Estatísticas de Carga */}
            <div className="responsive-grid-four" style={{ fontSize: 11 }}>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: 10 }}>COMMITS PROCESSADOS</span>
                <strong style={{ color: 'var(--text-main)' }}>18.642 / 21.480</strong>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>86,8% indexados</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: 10 }}>PRS PROCESSADOS</span>
                <strong style={{ color: 'var(--text-main)' }}>1.126 / 1.584</strong>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>458 restantes</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: 10 }}>PÁGINAS CONSUMIDAS</span>
                <strong style={{ color: 'var(--text-main)' }}>142 / 196</strong>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>100 itens por página</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: 10 }}>TAXA ATUAL</span>
                <strong style={{ color: '#34D399' }}>47,2 itens/s</strong>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: 10 }}>sem throttling</span>
              </div>
            </div>

            <div className="code-box-dark" style={{ fontSize: 10.5 }}>
              <code>&gt;_ POST /graphql • repository.object(expression: "main") • cursor=PR_38</code>
              <span style={{ float: 'right', color: '#10B981' }}>4.287 pts restantes</span>
            </div>
          </div>

          {/* Coluna Direita: Sincronização Incremental (Delta Sync) */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                  Sincronização Incremental (Delta Sync)
                </span>
                <span className="badge badge-success">● Ativa</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Próxima consulta traz somente alterações após o último commit persistido.
              </p>

              <div
                style={{
                  backgroundColor: 'var(--bg-code)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 6,
                  padding: '8px 10px',
                  marginTop: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--text-tertiary)', fontSize: 10, display: 'block' }}>since:</span>
                <strong style={{ color: 'var(--info)' }}>2026-10-02T14:27:31-03:00</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Endpoint</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                    GET /repos/{repository?.owner || 'owner'}/{repository?.name || 'repo'}/commits
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Próxima janela</span>
                  <strong style={{ color: '#FBBF24', fontFamily: 'var(--font-mono)' }}>14:32:45 BRT • em 27 s</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Economia de banda</span>
                  <span className="badge badge-success">ATIVADA • -94,6%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5 }}>
              <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                ?since=2026-10-02T17:27:31Z&amp;per_page=100
              </span>
              <span className="badge badge-info">ETag válido</span>
            </div>
          </div>
        </div>
      </div>}

      {/* Tabela: Vínculo de Contribuintes */}
      <div className="module-card">
        <div className="module-card-header">
          <div>
            <div className="module-card-title">Vínculo de Contribuintes</div>
            <div className="module-card-subtitle">
              Consolide múltiplos e-mails Git em um único perfil de estudante para manter as métricas acadêmicas corretas.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-success">● {students.length} identidades Git</span>
            <button onClick={exportContributors} className="btn-module btn-module-secondary btn-module-sm">
              <Download size={12} />
              <span>Exportar contribuintes</span>
            </button>
          </div>
        </div>

        <div className="table-toolbar">
          <div className="search-input-wrap">
            <Search size={13} className="search-input-icon" />
            <input
              type="text"
              placeholder="Buscar estudante, RA ou e-mail Git..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="select-chip"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">Todas as identidades</option>
              <option value="indexado">Identidades indexadas</option>
            </select>

            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
              {filteredStudents.length} identidade(s) exibida(s) • vínculo acadêmico depende do Módulo 1
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="module-table">
            <thead>
              <tr>
                <th>ESTUDANTE</th>
                <th>IDENTIFICAÇÃO ACADÊMICA</th>
                <th>E-MAILS GIT ASSOCIADOS</th>
                <th>COMMITS</th>
                <th>CONFIANÇA / STATUS</th>
                <th style={{ textAlign: 'right' }}>AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div>
                      <strong style={{ color: 'var(--text-main)', display: 'block' }}>{item.name}</strong>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 10.5 }}>{item.course}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{item.ra}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {item.emails.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 10.5 }}>Não exposto pela API</span>}
                      {item.emails.map((email, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10.5,
                            color: idx === 0 ? 'var(--info)' : 'var(--text-dim)',
                          }}
                        >
                          {email}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{item.commits}</strong>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 10, display: 'block' }}>
                      commits vinculados
                    </span>
                  </td>
                  <td>
                    {item.status === 'indexado' && (
                      <div>
                        <span className="badge badge-info">● Identidade Git indexada</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, display: 'block', marginTop: 2 }}>
                          Vínculo acadêmico: não realizado
                        </span>
                      </div>
                    )}
                    {item.status === 'sugerido' && (
                      <div>
                        <span className="badge badge-warning">● Revisão sugerida</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, display: 'block', marginTop: 2 }}>
                          Confiança do vínculo: {item.confidence}
                        </span>
                      </div>
                    )}
                    {item.status === 'duplicidade' && (
                      <div>
                        <span className="badge badge-danger">● Possível duplicidade</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, display: 'block', marginTop: 2 }}>
                          Confiança do vínculo: {item.confidence}
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.status === 'indexado' ? (
                      <button className="btn-module btn-module-secondary btn-module-sm" disabled title="A revisão manual de vínculos ainda não possui endpoint.">
                        <Users size={11} />
                        <span>Aguardando integração M1</span>
                      </button>
                    ) : (
                      <button className="btn-module btn-module-primary btn-module-sm" disabled title="A resolução de vínculos ainda não possui endpoint.">
                        <UserCheck size={11} />
                        <span>Resolução em desenvolvimento</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 28 }}>
                    Nenhuma identidade Git corresponde aos filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
