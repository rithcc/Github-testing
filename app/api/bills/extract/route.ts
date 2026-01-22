import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const payload = await getCurrentUser(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' },
        { status: 500 }
      )
    }

    // Initialize OpenAI client lazily
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Use GPT-4 Vision to extract bill data
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
            {
              type: 'text',
              text: `Analyze this bill/receipt image and extract the following information. Return ONLY a valid JSON object with no additional text or markdown formatting.

Required JSON format:
{
  "billType": "electricity" | "petrol" | "diesel" | "lpg" | "gas" | "water" | "shopping",
  "totalAmount": <number in rupees - the final/total amount on the bill>,
  "units": <number - kWh for electricity, liters for fuel, kg for gas, null if not visible>,
  "unitType": "kWh" | "L" | "kg" | "kL",
  "provider": "<provider name if visible>",
  "date": "<bill date if visible in YYYY-MM-DD format>",
  "confidence": "high" | "medium" | "low"
}

Rules:
1. For electricity bills: Look for "units consumed", "kWh", "units" fields. Total amount is usually labeled as "Amount Payable", "Total", "Net Amount"
2. For fuel receipts (petrol/diesel): Look for liters/litres, qty, volume. Total is the amount paid
3. For LPG/gas: Look for kg, cylinder (1 cylinder = 14.2 kg). Price is usually around Rs 800-1000 per cylinder
4. Always try to find the TOTAL AMOUNT in rupees - this is the most important field
5. If you can see the total amount but not units, set units to null - we will calculate it
6. Set confidence based on how clearly you can read the values

Return ONLY the JSON object, nothing else.`,
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const text = response.choices[0]?.message?.content || ''

    // Parse the JSON response
    let extractedData
    try {
      // Clean up the response - remove markdown code blocks if present
      let jsonText = text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7)
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3)
      }
      jsonText = jsonText.trim()

      extractedData = JSON.parse(jsonText)
    } catch {
      console.error('Failed to parse OpenAI response:', text)
      return NextResponse.json(
        { error: 'Could not extract bill data. Please try again or enter manually.', rawResponse: text },
        { status: 422 }
      )
    }

    // Validate required fields
    if (!extractedData.billType || (extractedData.units === null && extractedData.totalAmount === null)) {
      return NextResponse.json(
        { error: 'Could not identify bill type or amount. Please enter manually.', extractedData },
        { status: 422 }
      )
    }

    // If units not found but totalAmount exists, estimate units
    if (!extractedData.units && extractedData.totalAmount) {
      const pricePerUnit: Record<string, number> = {
        electricity: 7.5,
        petrol: 105,
        diesel: 92,
        lpg: 63.4, // 900/14.2
        gas: 63.4,
        water: 50,
      }
      const rate = pricePerUnit[extractedData.billType] || 10
      extractedData.units = Math.round((extractedData.totalAmount / rate) * 10) / 10
      extractedData.estimated = true
    }

    // Set default unit type if not provided
    if (!extractedData.unitType) {
      const defaultUnits: Record<string, string> = {
        electricity: 'kWh',
        petrol: 'L',
        diesel: 'L',
        lpg: 'kg',
        gas: 'kg',
        water: 'kL',
      }
      extractedData.unitType = defaultUnits[extractedData.billType] || 'units'
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    })
  } catch (error) {
    console.error('Bill extraction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to process image: ${errorMessage}` },
      { status: 500 }
    )
  }
}
