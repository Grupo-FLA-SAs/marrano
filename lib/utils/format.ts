export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatHandicapCompletion(carambolas: number, handicap: number): string {
  if (handicap === 0) return '—'
  const pct = (carambolas / handicap) * 100
  return `${pct.toFixed(1)}%`
}

export function playerDisplayName(player: { full_name: string; short_name: string | null }): string {
  return player.short_name || player.full_name
}

export function knockoutRoundLabel(round: string): string {
  const labels: Record<string, string> = {
    octavos: 'Octavos de final',
    cuartos: 'Cuartos de final',
    semifinal: 'Semifinal',
    final: 'Final',
    tercer_puesto: 'Tercer puesto',
  }
  return labels[round] ?? round
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    configuracion: 'Configuración',
    en_curso: 'En curso',
    finalizado: 'Finalizado',
    borrador: 'Borrador',
    activa: 'Activa',
    finalizada: 'Finalizada',
    pendiente: 'Pendiente',
    programado: 'Programado',
    en_juego: 'En juego',
    terminado: 'Terminado',
    anulado: 'Anulado',
    activo: 'Activo',
    retirado: 'Retirado',
    clasificado: 'Clasificado',
    eliminado: 'Eliminado',
  }
  return labels[status] ?? status
}

export function generatePublicToken(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16)
}
