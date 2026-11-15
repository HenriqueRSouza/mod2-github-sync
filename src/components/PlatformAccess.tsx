import React, { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react'
import { api, type PlatformLoginResult } from '../api'
import { createPlatformSession, type PlatformSession } from '../platformSession'
import { platformAccessErrorMessage } from '../platformErrors'

interface PlatformAccessProps {
  onAuthenticated: (session: PlatformSession, rememberOnDevice: boolean) => void
  onBack: () => void
  notice?: string | null
}

export const PlatformAccess: React.FC<PlatformAccessProps> = ({ onAuthenticated, onBack, notice }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberOnDevice, setRememberOnDevice] = useState(true)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const finishLogin = async (login: PlatformLoginResult) => {
    api.setAccessToken(login.access_token)
    const user = await api.platformMe()
    onAuthenticated(createPlatformSession(login.access_token, login.expires_in, user), rememberOnDevice)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      if (mode === 'register') {
        await api.platformRegister({
          email: email.trim(),
          display_name: displayName.trim(),
          password,
        })
        setFeedback({ type: 'success', text: 'Conta criada. Entrando no módulo…' })
      }
      const login = await api.platformLogin(email.trim(), password)
      await finishLogin(login)
    } catch (error) {
      api.setAccessToken(null)
      setFeedback({ type: 'error', text: platformAccessErrorMessage(error, mode) })
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode)
    setPassword('')
    setFeedback(null)
  }

  return (
    <main className="platform-access-page">
      <button className="platform-access-back" type="button" onClick={onBack}>
        <ArrowLeft size={15} /> Voltar ao início
      </button>

      <section className="platform-access-card" aria-labelledby="platform-access-title">
        <div className="platform-access-brand">
          <div className="module-logo-icon">M2</div>
          <div>
            <strong>GitHub Sync</strong>
            <span>Acesso unificado da plataforma</span>
          </div>
        </div>

        <div className="platform-access-heading">
          <div className="platform-access-icon"><LockKeyhole size={22} /></div>
          <div>
            <h1 id="platform-access-title">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h1>
            <p>
              {mode === 'login'
                ? 'Use as mesmas credenciais do Módulo 1 para acessar seus projetos.'
                : 'O cadastro é realizado pelo serviço oficial de autenticação do Módulo 1.'}
            </p>
          </div>
        </div>

        <div className="platform-access-tabs" role="tablist" aria-label="Entrar ou cadastrar">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
            Criar conta
          </button>
        </div>

        {notice && !feedback && (
          <div className="platform-feedback platform-feedback-info" role="status">
            <ShieldCheck size={15} />
            <span>{notice}</span>
          </div>
        )}

        {feedback && (
          <div className={`platform-feedback platform-feedback-${feedback.type}`} role="status">
            {feedback.type === 'success' ? <ShieldCheck size={15} /> : <LockKeyhole size={15} />}
            <span>{feedback.text}</span>
          </div>
        )}

        <form className="platform-access-form" onSubmit={submit}>
          {mode === 'register' && (
            <div>
              <label className="form-label" htmlFor="display-name">NOME DE EXIBIÇÃO</label>
              <input
                id="display-name"
                className="form-input"
                autoComplete="name"
                maxLength={120}
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Como você quer aparecer na plataforma"
              />
            </div>
          )}

          <div>
            <label className="form-label" htmlFor="platform-email">E-MAIL</label>
            <input
              id="platform-email"
              className="form-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="platform-password">SENHA</label>
            <div className="password-input-wrap">
              <input
                id="platform-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 12 : undefined}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? 'Mínimo de 12 caracteres' : 'Sua senha'}
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {mode === 'register' && <p className="form-help">Use pelo menos 12 caracteres. A senha é enviada somente ao serviço de autenticação.</p>}
          </div>

          <label className="remember-session-control">
            <input
              type="checkbox"
              checked={rememberOnDevice}
              onChange={(event) => setRememberOnDevice(event.target.checked)}
              disabled={loading}
            />
            <span>
              <strong>Lembrar de mim neste dispositivo</strong>
              <small>Restaura a sessão ao reabrir o navegador, até o token expirar.</small>
            </span>
          </label>

          <button className="btn-module btn-module-primary platform-access-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle size={15} className="animate-spin" /> : mode === 'login' ? <LockKeyhole size={15} /> : <UserPlus size={15} />}
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar no módulo' : 'Criar conta e entrar'}
          </button>
        </form>

        <div className="platform-security-note">
          <ShieldCheck size={16} />
          <span>O token RS256 expira em 30 minutos e é removido ao sair. Sua senha nunca é armazenada.</span>
        </div>
      </section>
    </main>
  )
}
