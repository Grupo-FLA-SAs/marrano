import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en .env.local')
}

export const sql = neon(process.env.DATABASE_URL)

// Helper para queries con parámetros
export async function query<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  return sql(strings, ...values) as Promise<T[]>
}
