import json, sys
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ── Colores MARRANO ──────────────────────────────────────────────────────────
DARK_GREEN  = colors.HexColor('#0d2818')
MED_GREEN   = colors.HexColor('#1a3a24')
LIGHT_GREEN = colors.HexColor('#2d5a3d')
GOLD        = colors.HexColor('#c9a227')
IVORY       = colors.HexColor('#f5f0e8')
FELT_GRAY   = colors.HexColor('#6b7c6b')
RED_PIG     = colors.HexColor('#c0392b')

# ── Leer datos ───────────────────────────────────────────────────────────────
with open('scripts/marranometro_data.json', encoding='utf-8') as f:
    data = json.load(f)

tournament = data['tournament']
rows       = data['rows']

# ── Documento ────────────────────────────────────────────────────────────────
out = 'scripts/Marranometro.pdf'
doc = SimpleDocTemplate(
    out,
    pagesize=landscape(A4),
    leftMargin=12*mm, rightMargin=12*mm,
    topMargin=10*mm, bottomMargin=10*mm,
)

# ── Estilos de texto ─────────────────────────────────────────────────────────
def style(size=8, bold=False, color=IVORY, align=TA_CENTER):
    return ParagraphStyle('x', fontSize=size, fontName='Helvetica-Bold' if bold else 'Helvetica',
                          textColor=color, alignment=align, leading=size*1.3)

# ── Cabecera ─────────────────────────────────────────────────────────────────
title_style  = style(20, bold=True, color=GOLD, align=TA_CENTER)
sub_style    = style(9,  bold=False, color=FELT_GRAY, align=TA_CENTER)

story = [
    Paragraph('MARRANOMETRO', title_style),
    Paragraph(f'Torneo: {tournament["name"]}  ·  Ranking historico por rendimiento', sub_style),
    Spacer(1, 5*mm),
]

# ── Tabla ────────────────────────────────────────────────────────────────────
headers = ['#', 'Jugador', 'H', 'PJ', 'PG%', 'SG/P', 'DS/P', 'H%', 'Ent.', 'Siembra']

def fmt_pct(v):   return f'{v*100:.0f}%' if v > 0 else '—'
def fmt_f2(v):    return f'{v:.2f}'
def fmt_ent(v):   return f'{v:.1f}' if v < 999 else '—'

table_data = [headers]
for r in rows:
    p = r['player']
    name = (p.get('short_name') or p['full_name'])
    if r['is_eliminated']:
        name = f'{name} (elim.)'
    seed = f'#{r["seed"]}' if r['seed'] else '—'
    table_data.append([
        str(r['position']),
        name,
        str(p['handicap']),
        str(r['pj']),
        fmt_pct(r['win_pct']),
        fmt_f2(r['sg_p']),
        fmt_f2(r['ds_p']),
        fmt_pct(r['hpct']),
        fmt_ent(r['ent']),
        seed,
    ])

# Anchos de columna (landscape A4 ≈ 267mm usable)
col_widths = [8*mm, 52*mm, 8*mm, 8*mm, 13*mm, 13*mm, 13*mm, 13*mm, 13*mm, 16*mm]

tbl = Table(table_data, colWidths=col_widths, repeatRows=1)

# Estilo base
ts = TableStyle([
    # Encabezado
    ('BACKGROUND',   (0,0), (-1,0), GOLD),
    ('TEXTCOLOR',    (0,0), (-1,0), DARK_GREEN),
    ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
    ('FONTSIZE',     (0,0), (-1,0), 8),
    ('ALIGN',        (0,0), (-1,0), 'CENTER'),
    ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
    ('ROWBACKGROUND',(0,1), (-1,-1), [MED_GREEN, LIGHT_GREEN]),
    ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
    ('FONTSIZE',     (0,1), (-1,-1), 7.5),
    ('TEXTCOLOR',    (0,1), (-1,-1), IVORY),
    ('ALIGN',        (0,1), (0,-1), 'CENTER'),    # #
    ('ALIGN',        (1,1), (1,-1), 'LEFT'),       # Nombre
    ('ALIGN',        (2,1), (-1,-1), 'CENTER'),    # resto
    ('GRID',         (0,0), (-1,-1), 0.3, colors.HexColor('#2a4a2a')),
    ('TOPPADDING',   (0,0), (-1,-1), 3),
    ('BOTTOMPADDING',(0,0), (-1,-1), 3),
    ('LEFTPADDING',  (0,0), (-1,-1), 4),
    ('RIGHTPADDING', (0,0), (-1,-1), 4),
])

# Filas eliminadas — gris y tachado visual (color apagado)
for i, r in enumerate(rows, start=1):
    if r['is_eliminated']:
        ts.add('TEXTCOLOR', (0,i), (-1,i), FELT_GRAY)
        ts.add('BACKGROUND', (0,i), (-1,i), colors.HexColor('#111f17'))
    elif r['seed']:
        # Clasificados con siembra — resaltar
        ts.add('TEXTCOLOR', (-1,i), (-1,i), GOLD)
        ts.add('FONTNAME',  (-1,i), (-1,i), 'Helvetica-Bold')

tbl.setStyle(ts)
story.append(tbl)

# ── Pie ──────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 4*mm))
story.append(Paragraph(
    'Criterios: PG% > SG/P > DS/P > H% > Entradas (menor=mejor)  ·  Disenado por TamApp',
    style(7, color=FELT_GRAY, align=TA_CENTER)
))

# ── Fondo oscuro en toda la página ──────────────────────────────────────────
def dark_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK_GREEN)
    canvas.rect(0, 0, landscape(A4)[0], landscape(A4)[1], fill=1, stroke=0)
    canvas.restoreState()

doc.build(story, onFirstPage=dark_bg, onLaterPages=dark_bg)
print(f'PDF generado: {out}')
