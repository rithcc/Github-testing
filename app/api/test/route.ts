import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count()
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount,
      databaseUrl: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json({
      status: 'error',
      database: 'failed',
      error: errorMessage,
      stack: errorStack,
      databaseUrl: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
      timestamp: new Date().toISOString()
    })
  }
}
// rebuild v3
