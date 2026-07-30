'use client'

import { useState, useRef } from 'react'

// Tipos de tarjetas disponibles
const CARD_TYPES = [
  { key: 'grupos_sorteados',    label: 'Grupos sorteados',      icon: '🎲', theme: 'marcada' },
  { key: 'resultado',           label: 'Resultado individual',  icon: '🎱', theme: 'gold' },
  { key: 'tabla_grupo',         label: 'Tabla de un grupo',     icon: '📋', theme: 'verde' },
  { key: 'clasificados',        label: 'Clasificados de fase',  icon: '✓',  theme: 'gold' },
  { key: 'marranos_ronda',      label: 'Marranos de la ronda',  icon: '🐷', theme: 'rojo' },
  { key: 'escapo_corral',       label: 'Escapó del corral',     icon: '🏃', theme: 'azul' },
  { key: 'marranometro',        label: 'Marranómetro',          icon: '📊', theme: 'verde' },
  { key: 'sembrados',           label: 'Sembrados de octavos',  icon: '🎯', theme: 'gold' },
  { key: 'octavos',             label: 'Cuadro de octavos',     icon: '8️⃣', theme: 'verde' },
  { key: 'cuartos',             label: 'Cuartos de final',      icon: '4️⃣', theme: 'verde' },
  { key: 'semifinal',           label: 'Semifinal',             icon: '2️⃣', theme: 'verde' },
  { key: 'final',               label: 'Final',                 icon: '🏆', theme: 'gold' },
  { key: 'campeon',             label: 'Campeón',               icon: '👑', theme: 'campeon' },
  { key: 'proximo',             label: 'Próximos partidos',     icon: '📅', theme: 'azul' },
  { key: 'marrano_grupo',       label: 'Marrano del grupo',     icon: '🐷', theme: 'rojo' },
]

const THEMES = {
  gold:    { bg: '#1a0f00', border: '#d4a843', title: '#d4a843', text: '#ede8b8' },
  verde:   { bg: '#061a06', border: '#2d7d2d', title: '#7ec07e', text: '#ede8b8' },
  rojo:    { bg: '#1a0606', border: '#b91c1c', title: '#f87171', text: '#ede8b8' },
  azul:    { bg: '#060e1a', border: '#4a74a8', title: '#9ab3d4', text: '#ede8b8' },
  campeon: { bg: '#0a0800', border: '#d4a843', title: '#d4a843', text: '#ede8b8' },
  marcada: { bg: '#0a1a0a', border: '#2d7d2d', title: '#7ec07e', text: '#ede8b8' },
}

const TEXTS: Record<string, string> = {
  grupos_sorteados: 'Se cerró el corral. ¡Que empiece la fiesta!',
  resultado: '',
  tabla_grupo: 'Tabla de posiciones',
  clasificados: '¡Escaparon del corral!',
  marranos_ronda: 'Eliminados con dignidad',
  escapo_corral: 'Escapó del corral por un pelo',
  marranometro: 'Marranómetro — Ranking histórico',
  sembrados: 'Cabezas de serie — Octavos de final',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: '¡La gran final!',
  campeon: '¡Maestro de las Tres Bandas!',
  proximo: 'Próximos partidos',
  marrano_grupo: 'Marrano del grupo',
}

export default function ImagenesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedType, setSelectedType] = useState(CARD_TYPES[0])
  const [customTitle, setCustomTitle] = useState('')
  const [customText, setCustomText] = useState(TEXTS['grupos_sorteados'])
  const [customBody, setCustomBody] = useState('')
  const [size, setSize] = useState<'portrait' | 'square'>('portrait')
  const [generated, setGenerated] = useState(false)

  function selectType(ct: typeof CARD_TYPES[0]) {
    setSelectedType(ct)
    setCustomTitle('')
    setCustomText(TEXTS[ct.key] ?? ct.label)
    setCustomBody('')
    setGenerated(false)
  }

  async function generateCard() {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = 1080
    const H = size === 'portrait' ? 1350 : 1080
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')!
    const theme = THEMES[selectedType.theme as keyof typeof THEMES] ?? THEMES.verde

    // Fondo
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, W, H)

    // Textura sutil (líneas diagonales)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)'
    ctx.lineWidth = 1
    for (let i = -H; i < W; i += 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke()
    }

    // Borde decorativo
    ctx.strokeStyle = theme.border
    ctx.lineWidth = 8
    ctx.strokeRect(24, 24, W - 48, H - 48)

    // Borde interior
    ctx.strokeStyle = theme.border + '55'
    ctx.lineWidth = 2
    ctx.strokeRect(36, 36, W - 72, H - 72)

    // Icono grande
    ctx.font = 'bold 120px serif'
    ctx.textAlign = 'center'
    ctx.fillText(selectedType.icon, W / 2, 220)

    // Título del torneo
    ctx.fillStyle = theme.text + '80'
    ctx.font = 'bold 36px serif'
    ctx.fillText('MARRANO', W / 2, 280)
    ctx.font = '22px sans-serif'
    ctx.fillText('Torneo de Billar a Tres Bandas', W / 2, 318)

    // Línea decorativa
    ctx.strokeStyle = theme.border
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(120, 345); ctx.lineTo(W - 120, 345)
    ctx.stroke()

    // Título de la tarjeta
    ctx.fillStyle = theme.title
    ctx.font = 'bold 64px serif'
    ctx.textAlign = 'center'
    const titleText = customTitle || selectedType.label
    wrapText(ctx, titleText, W / 2, 430, W - 160, 72)

    // Texto principal
    ctx.fillStyle = theme.text
    ctx.font = '42px sans-serif'
    const mainText = customText
    wrapText(ctx, mainText, W / 2, 560, W - 160, 52)

    // Cuerpo adicional
    if (customBody) {
      ctx.fillStyle = theme.text + 'cc'
      ctx.font = '34px sans-serif'
      wrapText(ctx, customBody, W / 2, 720, W - 160, 44)
    }

    // Línea inferior decorativa
    ctx.strokeStyle = theme.border
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(120, H - 130); ctx.lineTo(W - 120, H - 130)
    ctx.stroke()

    // Fecha
    const now = new Date()
    ctx.fillStyle = theme.text + '60'
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(now.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }), W / 2, H - 80)

    setGenerated(true)
  }

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ')
    let line = ''
    let currentY = y

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, currentY)
        line = word
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
  }

  async function downloadCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `marrano-${selectedType.key}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function shareCard() {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!navigator.share) {
      downloadCard()
      return
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], `marrano-${selectedType.key}.png`, { type: 'image/png' })
      try {
        await navigator.share({ files: [file], title: 'MARRANO — ' + selectedType.label })
      } catch {
        downloadCard()
      }
    }, 'image/png')
  }

  return (
    <div className="space-y-5 fade-in">
      <h1 className="text-2xl font-display font-bold text-gold-400">📸 Centro de imágenes</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {CARD_TYPES.map(ct => (
          <button
            key={ct.key}
            onClick={() => selectType(ct)}
            className={`p-3 rounded-xl border text-left transition-all text-sm ${
              selectedType.key === ct.key
                ? 'border-gold-400 bg-gold-400/10 text-gold-300'
                : 'border-felt-600 bg-felt-700/50 text-ivory-300 hover:border-felt-400'
            }`}
          >
            <span className="text-xl block mb-1">{ct.icon}</span>
            {ct.label}
          </button>
        ))}
      </div>

      {/* Personalización */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ivory-200">Personalizar tarjeta</h2>

        <div>
          <label className="label">Título personalizado</label>
          <input className="input" value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            placeholder={selectedType.label} />
        </div>

        <div>
          <label className="label">Texto principal</label>
          <input className="input" value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder="Texto que aparece en la tarjeta" />
        </div>

        <div>
          <label className="label">Contenido adicional (jugadores, marcador, etc.)</label>
          <textarea className="input h-20 resize-none" value={customBody}
            onChange={e => setCustomBody(e.target.value)}
            placeholder="Texto libre: nombres, marcadores, grupos…" />
        </div>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="size" value="portrait" className="accent-gold-400"
              checked={size === 'portrait'} onChange={() => setSize('portrait')} />
            <span className="text-sm text-ivory-200">Vertical (1080×1350)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="size" value="square" className="accent-gold-400"
              checked={size === 'square'} onChange={() => setSize('square')} />
            <span className="text-sm text-ivory-200">Cuadrada (1080×1080)</span>
          </label>
        </div>

        <button onClick={generateCard} className="btn-primary w-full">
          ✨ Generar tarjeta
        </button>
      </div>

      {/* Canvas (oculto visualmente, usado para generar) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview */}
      {generated && (
        <div className="space-y-3">
          <div className="border border-felt-600 rounded-xl overflow-hidden">
            <img
              src={canvasRef.current?.toDataURL('image/png')}
              alt="Tarjeta generada"
              className="w-full"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={downloadCard} className="btn-secondary flex-1">
              ⬇️ Descargar PNG
            </button>
            <button onClick={shareCard} className="btn-primary flex-1">
              📤 Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
