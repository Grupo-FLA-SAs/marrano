import { neon } from '@neondatabase/serverless'

let _client: ((...args: any[]) => Promise<any[]>) | null = null

function getClient() {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no está definida')
    _client = neon(url) as any
  }
  return _client
}

export const sql = ((...args: any[]) => getClient()(...args)) as unknown as (
  strings: TemplateStringsArray | string[],
  ...values: any[]
) => Promise<any[]>
