import React, { useState } from 'react'
import {
  Search,
  CheckCircle2,
  GitBranch,
  ExternalLink,
  RefreshCw,
  FolderGit2,
} from 'lucide-react'
import type { Commit } from '../../../api'
import type { InspectorItem } from '../../common/InspectorDrawer'

interface ExecutionsTableProps {
  commits: Commit[]
  onSelectExecution: (item: InspectorItem) => void
  onSyncNow?: () => void
  syncing?: boolean
  repoName?: string
}

export const ExecutionsTable: React.FC<ExecutionsTableProps> = ({
  commits,
  onSelectExecution,
  onSyncNow,
  syncing = false,
  repoName,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  // Mapeia commits reais da API do GitHub para o formato do visualizador
  const executions: InspectorItem[] = commits.map((c) => {
    return {
      id: c.sha,
      title: c.message.split('\n')[0] || c.sha.slice(0, 7),
      status: 'Sucesso',
      commit: c.sha.slice(0, 7),
      branch: c.branch || 'main',
      author: c.author || 'Autor não identificado',
      authorInitials: (c.author || 'EF')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      duration: 'Não medido',
      when: new Date(c.authored_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      executionId: `sync_${c.sha.slice(0, 8).toUpperCase()}`,
      url: c.url,
      payload: {
        sha: c.sha,
        author: c.author,
        branch: c.branch,
        message: c.message,
        authored_at: c.authored_at,
        files_count: c.files?.length || 0,
        files: c.files || [],
      },
      logs: [
        `[RESUMO LOCAL] Commit ${c.sha.slice(0, 7)} indexado`,
        `[RESUMO LOCAL] Autor: ${c.author || 'não identificado'}`,
        `[RESUMO LOCAL] Arquivos associados: ${c.files?.length || 0}`,
      ],
    }
  })

  const filteredExecutions = executions.filter((ex) => {
    const matchesSearch =
      (ex.commit && ex.commit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.author && ex.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.title && ex.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ex.branch && ex.branch.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  return (
    <div className="module-card">
      <div className="module-card-header">
        <div>
          <div className="module-card-title">
            Commits indexados
            <span className="badge badge-success" style={{ marginLeft: 6 }}>
              ● {commits.length} commits sincronizados
            </span>
          </div>
          <div className="module-card-subtitle">
            Registros devolvidos por GET /api/v1/commits para o repositório selecionado.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Busca */}
          <div className="search-input-wrap">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar commit, autor, branch..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>
      </div>

      {filteredExecutions.length > 0 ? (
        <div className="table-wrapper">
          <table className="module-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>STATUS</th>
                <th style={{ width: 140 }}>COMMIT</th>
                <th>BRANCH / MENSAGEM</th>
                <th style={{ width: 180 }}>AUTOR</th>
                <th style={{ width: 100 }}>PROCESSAMENTO</th>
                <th style={{ width: 140 }}>DATA / HORA</th>
                <th style={{ width: 80, textAlign: 'right' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredExecutions.map((item) => (
                <tr
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspecionar commit ${item.commit}`}
                  onClick={() => onSelectExecution(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectExecution(item)
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Clique para abrir o JSON e um resumo local do registro"
                >
                  <td>
                    {item.status === 'Sucesso' ? (
                      <span className="badge badge-success">
                        <CheckCircle2 size={11} />
                        Indexado
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className="mono-badge">{item.commit}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <GitBranch size={12} color="#60A5FA" />
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.branch}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="table-avatar">{item.authorInitials}</div>
                      <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 500 }}>
                        {item.author}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.duration}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {item.when}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                          }}
                          title="Abrir commit no GitHub"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'var(--bg-card-secondary)',
            borderRadius: 8,
          }}
        >
          <FolderGit2 size={36} color="#60A5FA" style={{ opacity: 0.6 }} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px' }}>
              Nenhum commit encontrado para este repositório
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {repoName ? `O repositório ${repoName} ainda não teve commits sincronizados.` : 'Selecione ou conecte um repositório para visualizar os commits.'}
            </p>
          </div>

          {onSyncNow && (
            <button
              onClick={onSyncNow}
              disabled={syncing || !repoName}
              className="btn-module btn-module-primary btn-module-sm"
              style={{ marginTop: 8 }}
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Sincronizando...' : repoName ? 'Sincronizar commits do GitHub agora' : 'Conecte um repositório'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
