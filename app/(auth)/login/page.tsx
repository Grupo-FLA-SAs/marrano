'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
      setLoading(false)
      return
    }

    const redirectTo = params.get('callbackUrl') ?? '/'
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="label">Correo electrónico</label>
        <input
          type="email"
          className="input"
          placeholder="organizador@ejemplo.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label className="label">Contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="input pr-12"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-felt-400 hover:text-ivory-300 text-sm"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary btn-lg w-full mt-2"
      >
        {loading ? 'Ingresando…' : 'Entrar al Corral'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen felt-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-10 left-10 text-felt-600 text-8xl opacity-20">⚈</div>
        <div className="absolute bottom-20 right-10 text-felt-600 text-6xl opacity-15">⚆</div>
        <div className="absolute top-1/2 left-4 text-felt-600 text-4xl opacity-10">◎</div>
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
                          bg-gold-400 shadow-xl mb-4">
            <span className="text-4xl">🐷</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-gold-400 tracking-tight">
            MARRANO
          </h1>
          <p className="text-felt-300 text-sm mt-1">Torneo de Billar a Tres Bandas</p>
          <p className="text-ivory-400 text-xs mt-1 italic">
            "El torneo donde todos juegan y nadie quiere quedar de último."
          </p>
        </div>

        <div className="card-dark">
          <h2 className="text-ivory-200 font-semibold text-center mb-6">
            Acceso de Organizador
          </h2>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-felt-400 text-xs text-center mt-6">
          Solo acceso para organizadores autorizados
        </p>
      </div>
    </div>
  )
}
