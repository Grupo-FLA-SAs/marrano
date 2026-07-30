import { neon } from '@neondatabase/serverless'

// En Vercel las env vars están disponibles en build y runtime.
// El string vacío no lanza hasta que se ejecute una query real.
const _sql = neon(process.env.DATABASE_URL ?? '')

// Tipado como any para evitar conflictos con FullQueryResults
export const sql: (...args: any[]) => Promise<any[]> = _sql as any
