import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET carbon scores for current user
export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const limit = parseInt(searchParams.get('limit') || '12')

    if (month) {
      // Get specific month's score
      const score = await prisma.carbonScore.findUnique({
        where: { userId_month: { userId: payload.sub, month } },
      })

      if (!score) {
        return NextResponse.json({ error: 'Score not found' }, { status: 404 })
      }

      return NextResponse.json({ score })
    }

    // Get history of scores
    const scores = await prisma.carbonScore.findMany({
      where: { userId: payload.sub },
      orderBy: { month: 'desc' },
      take: limit,
    })

    // Calculate summary stats
    const totalEmission = scores.reduce((sum, s) => sum + s.totalEmission, 0)
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0

    // Get current month score
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentScore = scores.find(s => s.month === currentMonth) || null

    return NextResponse.json({
      scores,
      summary: {
        totalEmission,
        averageScore,
        currentMonth: currentScore,
        monthsTracked: scores.length,
      },
    })
  } catch (error) {
    console.error('Get carbon scores error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
