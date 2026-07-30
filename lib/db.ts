import { neon } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

let _client: SqlFn | null = null

function getClient(): SqlFn {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no está definida')
    _client = neon(url) as unknown as SqlFn
  }
  return _client
}

// Lazy wrapper: keep tagged-template signature so TS can spread into rest params.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: SqlFn = (strings, ...values) => getClient()(strings, ...values)
