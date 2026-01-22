import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all available challenges
export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeUserProgress = searchParams.get('progress') === 'true'

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    const challenges = await prisma.challenge.findMany({
      where,
      include: includeUserProgress
        ? {
            userChallenges: {
              where: { userId: payload.sub },
            },
          }
        : undefined,
      orderBy: { points: 'desc' },
    })

    // Transform to include user progress
    const transformedChallenges = challenges.map((challenge) => ({
      ...challenge,
      userProgress: includeUserProgress && challenge.userChallenges?.[0]
        ? {
            status: challenge.userChallenges[0].status,
            progress: challenge.userChallenges[0].progress,
            carbonSaved: challenge.userChallenges[0].carbonSaved,
            startDate: challenge.userChallenges[0].startDate,
            endDate: challenge.userChallenges[0].endDate,
          }
        : null,
      userChallenges: undefined,
    }))

    return NextResponse.json({ challenges: transformedChallenges })
  } catch (error) {
    console.error('Get challenges error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST join a challenge
export async function POST(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { challengeId } = body

    if (!challengeId) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 })
    }

    // Check if challenge exists
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if already joined
    const existingUserChallenge = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: payload.sub, challengeId } },
    })

    if (existingUserChallenge) {
      return NextResponse.json({ error: 'Already joined this challenge' }, { status: 409 })
    }

    // Join the challenge
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + challenge.duration)

    const userChallenge = await prisma.userChallenge.create({
      data: {
        userId: payload.sub,
        challengeId,
        endDate,
      },
      include: { challenge: true },
    })

    return NextResponse.json({ userChallenge }, { status: 201 })
  } catch (error) {
    console.error('Join challenge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
