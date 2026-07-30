import { neon } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = (strings: any, ...values: any[]) => Promise<any[]>

let _client: SqlFn | null = null

function getClient(): SqlFn {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no está definida')
    _client = neon(url) as unknown as SqlFn
  }
  return _client
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: SqlFn = (...args: any[]) => getClient()(...args)
