import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET single challenge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        userChallenges: {
          where: { userId: payload.sub },
        },
      },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    return NextResponse.json({
      challenge: {
        ...challenge,
        userProgress: challenge.userChallenges[0] || null,
        userChallenges: undefined,
      },
    })
  } catch (error) {
    console.error('Get challenge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update user challenge progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: challengeId } = await params
    const body = await request.json()
    const { progress, carbonSaved, status } = body

    // Find user's challenge
    const userChallenge = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: payload.sub, challengeId } },
      include: { challenge: true },
    })

    if (!userChallenge) {
      return NextResponse.json({ error: 'You have not joined this challenge' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress))
    if (carbonSaved !== undefined) updateData.carbonSaved = carbonSaved
    if (status) updateData.status = status

    // Auto-complete if progress reaches 100
    if (progress === 100 && !status) {
      updateData.status = 'completed'
    }

    const updated = await prisma.userChallenge.update({
      where: { id: userChallenge.id },
      data: updateData,
      include: { challenge: true },
    })

    return NextResponse.json({ userChallenge: updated })
  } catch (error) {
    console.error('Update challenge progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE leave a challenge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: challengeId } = await params

    const userChallenge = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: payload.sub, challengeId } },
    })

    if (!userChallenge) {
      return NextResponse.json({ error: 'You have not joined this challenge' }, { status: 404 })
    }

    await prisma.userChallenge.delete({
      where: { id: userChallenge.id },
    })

    return NextResponse.json({ message: 'Left the challenge successfully' })
  } catch (error) {
    console.error('Leave challenge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
