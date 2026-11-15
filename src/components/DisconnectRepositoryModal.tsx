import React, { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import type { Repository } from '../api'

interface DisconnectRepositoryModalProps {
  repository: Repository | null
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirma uma ação local do Módulo 2. Não exclui o projeto compartilhado,
 * que permanece sob custódia do Módulo 1 e dos demais módulos.
 */
export const DisconnectRepositoryModal: React.FC<DisconnectRepositoryModalProps> = ({
  repository,
  loading,
  onCancel,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!repository) return
    const previousFocus = document.activeElement as HTMLElement | null
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      previousFocus?.focus()
    }
  }, [loading, onCancel, repository])

  if (!repository) return null

  return (
    <div className="modal-backdrop" onClick={() => { if (!loading) onCancel() }}>
      <div ref={dialogRef} className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="disconnect-repository-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title-content">
            <div className="modal-title-icon modal-title-icon-danger"><AlertTriangle size={18} /></div>
            <div>
              <h3 id="disconnect-repository-title">Desvincular repositório</h3>
              <p>Remover <strong>{repository.full_name}</strong> da integração GitHub Sync.</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} disabled={loading} aria-label="Cancelar desvinculação"><X size={17} /></button>
        </div>

        <div className="disconnect-repository-warning">
          <AlertTriangle size={16} />
          <p>Os commits, branches, pull requests, entregas de webhook e credenciais guardados <strong>neste módulo</strong> serão removidos. O projeto da plataforma não será excluído: ele continua sendo gerenciado pelo Módulo 1.</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-module btn-module-secondary" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button type="button" className="btn-module btn-module-danger" onClick={onConfirm} disabled={loading}>
            <Trash2 size={15} /> {loading ? 'Desvinculando…' : 'Desvincular repositório'}
          </button>
        </div>
      </div>
    </div>
  )
}
