import "server-only";
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logLevel =
  process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['query', 'warn', 'error']

const SLOW_QUERY_MS = Number(process.env.PRISMA_SLOW_QUERY_MS || 200)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Slow-query warn (production-safe: no parameter values are logged).
db.$on('query' as never, ((event: { duration: number; query: string }) => {
  if (event.duration >= SLOW_QUERY_MS) {
    const q = String(event.query || '').replace(/\s+/g, ' ').slice(0, 500)
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify({ level: 'warn', kind: 'slow_query', ms: event.duration, query: q }))
  }
}) as never)