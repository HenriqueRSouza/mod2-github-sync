import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, FolderPlus, X } from 'lucide-react'
import { ApiError, api, type PlatformProject } from '../api'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (project: PlatformProject) => void
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const resetAndClose = useCallback(() => {
    setName('')
    setDescription('')
    setError(null)
    setLoading(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) resetAndClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, loading, resetAndClose])

  if (!isOpen) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const project = await api.createPlatformProject({ name: name.trim(), description: description.trim() })
      onSuccess(project)
      resetAndClose()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setError('Sua sessão expirou. Entre novamente.')
      else setError('Não foi possível criar o projeto. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => { if (!loading) resetAndClose() }}>
      <div ref={dialogRef} className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-title-row">
          <div className="modal-title-content">
            <div className="modal-title-icon"><FolderPlus size={18} /></div>
            <div>
              <h3 id="create-project-title">Criar projeto</h3>
              <p>O projeto será criado e mantido pelo Módulo 1.</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={resetAndClose} aria-label="Fechar criação de projeto"><X size={17} /></button>
        </div>

        {error && <div className="platform-feedback platform-feedback-error" role="alert"><AlertCircle size={15} /> {error}</div>}

        <form className="platform-access-form" onSubmit={submit}>
          <div>
            <label className="form-label" htmlFor="project-name">NOME DO PROJETO</label>
            <input id="project-name" className="form-input" maxLength={120} required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Plataforma de Engenharia" />
          </div>
          <div>
            <label className="form-label" htmlFor="project-description">DESCRIÇÃO</label>
            <textarea id="project-description" className="form-input form-textarea" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto compartilhado com os demais módulos" />
            <p className="form-help">{description.length}/2000 caracteres</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-module btn-module-secondary" onClick={resetAndClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-module btn-module-primary" disabled={loading || !name.trim()}>{loading ? 'Criando…' : 'Criar projeto'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
