export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen felt-bg flex flex-col">
      {/* Top bar (desktop) */}
      <header className="hidden md:flex items-center justify-between
                         bg-carbon-900 border-b border-felt-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐷</span>
          <span className="font-display font-bold text-gold-400 text-xl tracking-tight">
            MARRANO
          </span>
          <span className="text-gold-400/50 text-xs ml-1">V1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-felt-400 text-xs">{session.user?.email}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between
                         bg-carbon-900 border-b border-felt-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐷</span>
          <span className="font-display font-bold text-gold-400 text-lg">MARRANO</span>
        </div>
        <LogoutButton />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-56 bg-carbon-900 border-r border-felt-700">
          <AdminNav />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 pb-24 md:pb-6">
            {children}
          </div>
          <div className="hidden md:block text-center text-ivory-500 text-xs pb-4">
            Diseñado por TamApp
          </div>
        </main>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
                      bg-carbon-900 border-t border-felt-700">
        <AdminNav mobile />
      </nav>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        className="text-felt-400 hover:text-ivory-300 text-xs transition-colors"
      >
        Salir
      </button>
    </form>
  )
}
