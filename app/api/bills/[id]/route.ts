import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET single bill by ID
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

    const bill = await prisma.bill.findFirst({
      where: { id, userId: payload.sub },
    })

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    return NextResponse.json({ bill })
  } catch (error) {
    console.error('Get bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update bill
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if bill exists and belongs to user
    const existingBill = await prisma.bill.findFirst({
      where: { id, userId: payload.sub },
    })

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    // Emission factors
    const EMISSION_FACTORS: Record<string, { factor: number; unit: string }> = {
      electricity: { factor: 0.82, unit: 'kWh' },
      petrol: { factor: 2.31, unit: 'L' },
      diesel: { factor: 2.68, unit: 'L' },
      lpg: { factor: 1.51, unit: 'L' },
      gas: { factor: 2.0, unit: 'kg' },
      water: { factor: 0.376, unit: 'kL' },
    }

    const type = body.type?.toLowerCase() || existingBill.type
    const units = body.units !== undefined ? body.units : existingBill.units
    const emissionFactor = EMISSION_FACTORS[type]

    if (!emissionFactor) {
      return NextResponse.json({ error: 'Invalid bill type' }, { status: 400 })
    }

    const carbonEmission = (units || 0) * emissionFactor.factor

    const updateData: Record<string, unknown> = {}
    if (body.type) updateData.type = type
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.units !== undefined) {
      updateData.units = body.units
      updateData.carbonEmission = carbonEmission
      updateData.unitType = emissionFactor.unit
    }
    if (body.date) {
      const billDate = new Date(body.date)
      updateData.date = billDate
      updateData.month = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`
    }
    if (body.notes !== undefined) updateData.notes = body.notes

    const bill = await prisma.bill.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ bill })
  } catch (error) {
    console.error('Update bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE bill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if bill exists and belongs to user
    const existingBill = await prisma.bill.findFirst({
      where: { id, userId: payload.sub },
    })

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    await prisma.bill.delete({ where: { id } })

    return NextResponse.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    console.error('Delete bill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
