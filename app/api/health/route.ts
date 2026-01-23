import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
// force deploy Fri, Jan 23, 2026  8:09:20 AM
