import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET user's challenges
export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { userId: payload.sub }
    if (status) where.status = status

    const userChallenges = await prisma.userChallenge.findMany({
      where,
      include: { challenge: true },
      orderBy: { startDate: 'desc' },
    })

    // Calculate stats
    const stats = {
      active: userChallenges.filter((uc) => uc.status === 'active').length,
      completed: userChallenges.filter((uc) => uc.status === 'completed').length,
      totalCarbonSaved: userChallenges.reduce((sum, uc) => sum + uc.carbonSaved, 0),
      totalPoints: userChallenges
        .filter((uc) => uc.status === 'completed')
        .reduce((sum, uc) => sum + uc.challenge.points, 0),
    }

    return NextResponse.json({ userChallenges, stats })
  } catch (error) {
    console.error('Get user challenges error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
