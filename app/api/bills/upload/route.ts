import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Emission factors (kg CO2 per unit)
const EMISSION_FACTORS = {
  electricity: { factor: 0.82, unit: 'kWh' },
  petrol: { factor: 2.31, unit: 'L' },
  diesel: { factor: 2.68, unit: 'L' },
  lpg: { factor: 1.51, unit: 'L' },
  gas: { factor: 2.0, unit: 'kg' },
  water: { factor: 0.376, unit: 'kL' },
}

// Simple pattern matching for bill parsing
function parseBillText(text: string, billType: string): { units: number | null; amount: number | null } {
  let units: number | null = null
  let amount: number | null = null

  const lowerText = text.toLowerCase()

  // Patterns for different bill types
  if (billType === 'electricity') {
    // Look for kWh patterns
    const kwhPatterns = [
      /(\d+(?:\.\d+)?)\s*kwh/i,
      /units?\s*:?\s*(\d+(?:\.\d+)?)/i,
      /consumption\s*:?\s*(\d+(?:\.\d+)?)/i,
    ]
    for (const pattern of kwhPatterns) {
      const match = text.match(pattern)
      if (match) {
        units = parseFloat(match[1])
        break
      }
    }
  } else if (billType === 'petrol' || billType === 'diesel') {
    // Look for liter patterns
    const literPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:l|ltr|liters?|litres?)/i,
      /qty\s*:?\s*(\d+(?:\.\d+)?)/i,
    ]
    for (const pattern of literPatterns) {
      const match = text.match(pattern)
      if (match) {
        units = parseFloat(match[1])
        break
      }
    }
  } else if (billType === 'lpg' || billType === 'gas') {
    // Look for kg or cylinder patterns
    const gasPatterns = [
      /(\d+(?:\.\d+)?)\s*kg/i,
      /(\d+)\s*cylinder/i,
    ]
    for (const pattern of gasPatterns) {
      const match = text.match(pattern)
      if (match) {
        units = parseFloat(match[1])
        // If it's cylinders, convert to kg (1 cylinder ≈ 14.2 kg)
        if (lowerText.includes('cylinder')) {
          units = units * 14.2
        }
        break
      }
    }
  }

  // Look for amount patterns (common for all)
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /(?:total|amount|payable)\s*:?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  ]
  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''))
      break
    }
  }

  return { units, amount }
}

// POST upload and process bill
export async function POST(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const billType = formData.get('type') as string
    const dateStr = formData.get('date') as string
    const ocrText = formData.get('ocrText') as string | null
    const manualUnits = formData.get('units') as string | null
    const manualAmount = formData.get('amount') as string | null

    if (!billType || !dateStr) {
      return NextResponse.json(
        { error: 'Bill type and date are required' },
        { status: 400 }
      )
    }

    const type = billType.toLowerCase()
    const emissionFactor = EMISSION_FACTORS[type as keyof typeof EMISSION_FACTORS]

    if (!emissionFactor) {
      return NextResponse.json({ error: 'Invalid bill type' }, { status: 400 })
    }

    let receiptUrl: string | null = null
    let extractedData: Record<string, unknown> | null = null
    let units = manualUnits ? parseFloat(manualUnits) : null
    let amount = manualAmount ? parseFloat(manualAmount) : null

    // Save file if provided
    if (file) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })

      // Generate unique filename
      const ext = path.extname(file.name)
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
      const filepath = path.join(uploadsDir, filename)

      await writeFile(filepath, buffer)
      receiptUrl = `/uploads/${filename}`
    }

    // Parse OCR text if provided and units not manually set
    if (ocrText && units === null) {
      const parsed = parseBillText(ocrText, type)
      units = parsed.units
      if (amount === null) amount = parsed.amount
      extractedData = {
        rawText: ocrText.substring(0, 1000), // Store first 1000 chars
        parsedUnits: parsed.units,
        parsedAmount: parsed.amount,
      }
    }

    if (units === null) {
      return NextResponse.json(
        {
          error: 'Could not extract units from bill. Please enter manually.',
          requiresManualInput: true,
          extractedData,
        },
        { status: 422 }
      )
    }

    // Calculate carbon emission
    const carbonEmission = units * emissionFactor.factor

    // Format month
    const billDate = new Date(dateStr)
    const month = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`

    // Create bill
    const bill = await prisma.bill.create({
      data: {
        type,
        amount: amount || 0,
        units,
        unitType: emissionFactor.unit,
        carbonEmission,
        date: billDate,
        month,
        receiptUrl,
        extractedData: extractedData ? JSON.stringify(extractedData) : null,
        userId: payload.sub,
      },
    })

    // Update carbon score
    await updateCarbonScore(payload.sub, month)

    return NextResponse.json({
      bill,
      carbonEmission,
      message: `Bill processed. Carbon emission: ${carbonEmission.toFixed(2)} kg CO2`,
    }, { status: 201 })
  } catch (error) {
    console.error('Upload bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update carbon score (same as in bills route)
async function updateCarbonScore(userId: string, month: string) {
  const bills = await prisma.bill.findMany({
    where: { userId, month },
  })

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
  const score = Math.max(0, Math.min(100, Math.round(100 - (totalEmission / 3))))

  let grade = 'F'
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 70) grade = 'C'
  else if (score >= 60) grade = 'D'
  else if (score >= 50) grade = 'E'

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
      nationalAverage: 167,
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
