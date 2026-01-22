import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Emission factors (kg CO2 per unit)
const EMISSION_FACTORS = {
  electricity: { factor: 0.82, unit: 'kWh' }, // India grid
  petrol: { factor: 2.31, unit: 'L' },
  diesel: { factor: 2.68, unit: 'L' },
  lpg: { factor: 1.51, unit: 'L' },
  gas: { factor: 2.0, unit: 'kg' }, // Natural gas
  water: { factor: 0.376, unit: 'kL' }, // Per kiloliter
}

// GET all bills for current user
export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: payload.sub }
    if (month) where.month = month
    if (type) where.type = type

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.bill.count({ where }),
    ])

    return NextResponse.json({ bills, total, limit, offset })
  } catch (error) {
    console.error('Get bills error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new bill
export async function POST(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, units, date, notes, extractedData, entryMethod } = body

    // Validation
    if (!type || !date) {
      return NextResponse.json(
        { error: 'Type and date are required' },
        { status: 400 }
      )
    }

    const billType = type.toLowerCase()
    const emissionFactor = EMISSION_FACTORS[billType as keyof typeof EMISSION_FACTORS]

    if (!emissionFactor) {
      return NextResponse.json(
        { error: 'Invalid bill type' },
        { status: 400 }
      )
    }

    // Calculate carbon emission
    const unitsValue = units || 0
    const carbonEmission = unitsValue * emissionFactor.factor

    // Format month
    const billDate = new Date(date)
    const month = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`

    const bill = await prisma.bill.create({
      data: {
        type: billType,
        amount: amount || 0,
        units: unitsValue,
        unitType: emissionFactor.unit,
        carbonEmission,
        date: billDate,
        month,
        notes: notes || null,
        extractedData: extractedData ? JSON.stringify(extractedData) : null,
        entryMethod: entryMethod || 'manual',
        userId: payload.sub,
      },
    })

    // Update carbon score for the month
    await updateCarbonScore(payload.sub, month)

    return NextResponse.json({ bill }, { status: 201 })
  } catch (error) {
    console.error('Create bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update carbon score
async function updateCarbonScore(userId: string, month: string) {
  // Get all bills for the month
  const bills = await prisma.bill.findMany({
    where: { userId, month },
  })

  // Calculate totals by category
  let electricityEmission = 0
  let transportEmission = 0
  let gasEmission = 0
  let waterEmission = 0
  let otherEmission = 0

  bills.forEach((bill) => {
    switch (bill.type) {
      case 'electricity':
        electricityEmission += bill.carbonEmission
        break
      case 'petrol':
      case 'diesel':
        transportEmission += bill.carbonEmission
        break
      case 'lpg':
      case 'gas':
        gasEmission += bill.carbonEmission
        break
      case 'water':
        waterEmission += bill.carbonEmission
        break
      default:
        otherEmission += bill.carbonEmission
    }
  })

  const totalEmission = electricityEmission + transportEmission + gasEmission + waterEmission + otherEmission

  // Calculate score (lower emissions = higher score)
  // Average Indian household emits ~150-200 kg CO2/month
  const score = Math.max(0, Math.min(100, Math.round(100 - (totalEmission / 3))))

  // Calculate grade
  let grade = 'F'
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'
  else if (score >= 50) grade = 'E'

  // Get previous month's emission for comparison
  const [year, monthNum] = month.split('-').map(Number)
  const prevMonth = monthNum === 1
    ? `${year - 1}-12`
    : `${year}-${String(monthNum - 1).padStart(2, '0')}`

  const prevScore = await prisma.carbonScore.findUnique({
    where: { userId_month: { userId, month: prevMonth } },
  })

  const previousMonthChange = prevScore
    ? ((totalEmission - prevScore.totalEmission) / prevScore.totalEmission) * 100
    : null

  // Upsert carbon score
  await prisma.carbonScore.upsert({
    where: { userId_month: { userId, month } },
    update: {
      totalEmission,
      score,
      grade,
      electricityEmission,
      transportEmission,
      gasEmission,
      waterEmission,
      otherEmission,
      previousMonthChange,
      nationalAverage: 167, // Average monthly household emission in India
    },
    create: {
      userId,
      month,
      totalEmission,
      score,
      grade,
      electricityEmission,
      transportEmission,
      gasEmission,
      waterEmission,
      otherEmission,
      previousMonthChange,
      nationalAverage: 167,
    },
  })
}
