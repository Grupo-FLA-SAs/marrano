'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/',              label: 'El Corral',      icon: '🏠', mobileLabel: 'Inicio' },
  { href: '/jugadores',     label: 'Jugadores',      icon: '👥', mobileLabel: 'Jugadores' },
  { href: '/fases',         label: 'La Marranera',   icon: '🐷', mobileLabel: 'Fases' },
  { href: '/marranometro',  label: 'Marranómetro',   icon: '📊', mobileLabel: 'Ranking' },
  { href: '/eliminatorias', label: 'Eliminatorias',  icon: '🏆', mobileLabel: 'Bracket' },
  { href: '/imagenes',      label: 'Tarjetas',       icon: '📸', mobileLabel: 'Tarjetas' },
  { href: '/torneo',        label: 'Configuración',  icon: '⚙️', mobileLabel: 'Config' },
]

interface Props { mobile?: boolean }

export default function AdminNav({ mobile = false }: Props) {
  const pathname = usePathname()

  if (mobile) {
    // Mostrar solo las primeras 5 en móvil
    const mobileItems = navItems.slice(0, 5)
    return (
      <div className="flex justify-around items-center py-1">
        {mobileItems.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors',
                active ? 'text-gold-400' : 'text-felt-400 hover:text-ivory-300'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.mobileLabel}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <nav className="flex flex-col gap-1 p-3 pt-4">
      {navItems.map(item => {
        const active = pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-felt-700 text-gold-400 border border-felt-600'
                : 'text-felt-300 hover:text-ivory-200 hover:bg-felt-800/50'
            )}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
