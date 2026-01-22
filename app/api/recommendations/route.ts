import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET recommendations
export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const impact = searchParams.get('impact')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { isGlobal: true }
    if (category) where.category = category
    if (impact) where.impact = impact

    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: { potentialSaving: 'desc' },
      take: limit,
    })

    // Get user's carbon score to provide personalized recommendations
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const userScore = await prisma.carbonScore.findUnique({
      where: { userId_month: { userId: payload.sub, month: currentMonth } },
    })

    // Prioritize recommendations based on user's highest emission category
    let prioritizedRecommendations = recommendations
    if (userScore) {
      const emissions = [
        { category: 'energy', value: userScore.electricityEmission },
        { category: 'transport', value: userScore.transportEmission },
        { category: 'lifestyle', value: userScore.gasEmission },
      ].sort((a, b) => b.value - a.value)

      const topCategory = emissions[0]?.category

      prioritizedRecommendations = recommendations.sort((a, b) => {
        if (a.category === topCategory && b.category !== topCategory) return -1
        if (b.category === topCategory && a.category !== topCategory) return 1
        return b.potentialSaving - a.potentialSaving
      })
    }

    return NextResponse.json({
      recommendations: prioritizedRecommendations,
      userTopEmissionCategory: userScore
        ? userScore.electricityEmission >= userScore.transportEmission
          ? 'energy'
          : 'transport'
        : null,
    })
  } catch (error) {
    console.error('Get recommendations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
