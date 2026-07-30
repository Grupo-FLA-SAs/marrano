import { neon } from '@neondatabase/serverless'

// Lazy: no lanza en build time, solo cuando se hace una query real
export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida')
  return neon(url)
}

// sql como tagged template — se inicializa la primera vez que se usa
export const sql: ReturnType<typeof neon> = new Proxy(
  function () {} as any,
  {
    apply(_t, _this, args) {
      return (getSql() as any)(...args)
    },
    get(_t, prop) {
      return (getSql() as any)[prop]
    },
  }
)
