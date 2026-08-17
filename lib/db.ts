import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export type Sql = NeonQueryFunction<false, false>

let _client: Sql | null = null

/** Neon HTTP client (lazy). Supports sql`...` and sql.transaction([...]). */
export function getSql(): Sql {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL no está definida')
    _client = neon(url)
  }
  return _client
}

/**
 * Tagged-template proxy that also forwards `.transaction`.
 * Avoids spreading loose `any[]` into a non-rest call signature.
 */
export const sql: Sql = new Proxy(function sqlTag() {} as unknown as Sql, {
  apply(_target, _thisArg, args) {
    const client = getSql() as unknown as (...a: unknown[]) => unknown
    return client(...args)
  },
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined // not a Promise
    const client = getSql() as unknown as Record<PropertyKey, unknown>
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
