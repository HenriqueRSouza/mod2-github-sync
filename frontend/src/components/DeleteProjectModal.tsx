import React, { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import type { PlatformProject } from '../api'

interface DeleteProjectModalProps {
  project: PlatformProject | null
  linkedRepositories: number
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirmation for the Module 1 DELETE contract. It never promises cascade:
 * remote repositories and M2 links must be removed explicitly first.
 */
export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  project,
  linkedRepositories,
  loading,
  error,
  onCancel,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!project) return
    const previousFocus = document.activeElement as HTMLElement | null
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      previousFocus?.focus()
    }
  }, [loading, onCancel, project])

  if (!project) return null

  const blocked = linkedRepositories > 0
  return (
    <div className="modal-backdrop" onClick={() => { if (!loading) onCancel() }}>
      <div ref={dialogRef} className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-project-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title-content">
            <div className="modal-title-icon modal-title-icon-danger"><AlertTriangle size={18} /></div>
            <div>
              <h3 id="delete-project-title">Excluir projeto</h3>
              <p>Excluir <strong>{project.name}</strong> da plataforma.</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} disabled={loading} aria-label="Cancelar exclusão"><X size={17} /></button>
        </div>

        <div className="disconnect-repository-warning">
          <AlertTriangle size={16} />
          <p>O Módulo 1 só remove projetos vazios. A exclusão não apaga repositórios no GitHub, itens do Backlog ou dados de outros módulos.</p>
        </div>

        {blocked && (
          <div className="platform-feedback platform-feedback-error" role="alert">
            <AlertTriangle size={15} /> Desvincule {linkedRepositories === 1 ? 'o repositório vinculado' : `os ${linkedRepositories} repositórios vinculados`} do GitHub Sync antes de continuar.
          </div>
        )}
        {error && <div className="platform-feedback platform-feedback-error" role="alert"><AlertTriangle size={15} /> {error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-module btn-module-secondary" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button type="button" className="btn-module btn-module-danger" onClick={onConfirm} disabled={loading || blocked}>
            <Trash2 size={15} /> {loading ? 'Excluindo…' : 'Excluir projeto'}
          </button>
        </div>
      </div>
    </div>
  )
}
