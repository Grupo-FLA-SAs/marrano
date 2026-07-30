// Este proyecto migró de Supabase a Neon + NextAuth.
// No importar este archivo. Usar lib/db.ts para queries y next-auth para auth.
export async function createClient(): Promise<never> {
  throw new Error('Supabase fue reemplazado por Neon. Usa lib/db/queries.ts o /api routes.')
}

export async function createServiceClient(): Promise<never> {
  throw new Error('Supabase fue reemplazado por Neon. Usa lib/db/queries.ts o /api routes.')
}
