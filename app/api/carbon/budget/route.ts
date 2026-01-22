import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET carbon budgets for current user
export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    if (month) {
      const budget = await prisma.carbonBudget.findUnique({
        where: { userId_month: { userId: payload.sub, month } },
      })

      if (!budget) {
        return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
      }

      // Get current emission for the month
      const score = await prisma.carbonScore.findUnique({
        where: { userId_month: { userId: payload.sub, month } },
      })

      return NextResponse.json({
        budget: {
          ...budget,
          currentEmission: score?.totalEmission || 0,
          percentUsed: budget.targetEmission > 0
            ? Math.round(((score?.totalEmission || 0) / budget.targetEmission) * 100)
            : 0,
        },
      })
    }

    // Get all budgets
    const budgets = await prisma.carbonBudget.findMany({
      where: { userId: payload.sub },
      orderBy: { month: 'desc' },
      take: 12,
    })

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Get carbon budgets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create or update carbon budget
export async function POST(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { month, targetEmission, electricityBudget, transportBudget, gasBudget } = body

    if (!month || !targetEmission) {
      return NextResponse.json(
        { error: 'Month and target emission are required' },
        { status: 400 }
      )
    }

    const budget = await prisma.carbonBudget.upsert({
      where: { userId_month: { userId: payload.sub, month } },
      update: {
        targetEmission,
        electricityBudget: electricityBudget || null,
        transportBudget: transportBudget || null,
        gasBudget: gasBudget || null,
      },
      create: {
        userId: payload.sub,
        month,
        targetEmission,
        electricityBudget: electricityBudget || null,
        transportBudget: transportBudget || null,
        gasBudget: gasBudget || null,
      },
    })

    return NextResponse.json({ budget }, { status: 201 })
  } catch (error) {
    console.error('Create carbon budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
