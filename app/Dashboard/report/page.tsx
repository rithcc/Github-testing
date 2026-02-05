"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  IconLeaf,
  IconBolt,
  IconCar,
  IconFlame,
  IconDroplet,
  IconLoader2,
  IconDownload,
  IconPrinter,
  IconScan,
  IconPencil,
  IconCalendar,
  IconTrendingUp,
  IconTrendingDown,
  IconTree,
  IconWorldPin,
  IconChartBar,
  IconShieldCheck,
  IconAlertTriangle,
  IconShieldX,
  IconBulb,
  IconTarget,
  IconWorld,
} from "@tabler/icons-react"
import { api } from "@/lib/api"
import { CarbonBreakdownChart } from "@/components/CarbonBreakdownChart"
import { ImpactVisualization } from "@/components/ImpactVisualization"

interface Bill {
  id: string
  type: string
  units: number
  unitType: string
  carbonEmission: number
  date: string
  month: string
  entryMethod: string
  extractedData?: string | Record<string, unknown> | null
}

interface CarbonScore {
  month: string
  totalEmission: number
  score: number
  grade: string
  electricityEmission: number
  transportEmission: number
  gasEmission: number
  waterEmission: number
  otherEmission: number
}

interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  impact: string
  potentialSaving: number
  difficulty: string
}

interface ReportData {
  bills: Bill[]
  scores: CarbonScore[]
  summary: {
    totalCarbon: number
    totalBills: number
    scannerEntries: number
    manualEntries: number
    avgMonthlyCarbon: number
    bestMonth: { month: string; emission: number } | null
    worstMonth: { month: string; emission: number } | null
  }
  breakdown: {
    electricity: number
    transport: number
    gas: number
    water: number
    other: number
  }
  recommendations: Recommendation[]
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6months' | '3months' | '1month'>('all')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchReportData() {
      try {
        // Fetch all bills
        const { data: billsData } = await api.getBills({ limit: 500 })

        // Fetch carbon scores
        const { data: scoresData } = await api.getCarbonScores({ limit: 12 })

        // Fetch recommendations
        const { data: recommendationsData } = await api.getRecommendations({ limit: 10 })

        const bills: Bill[] = billsData?.bills || []
        const scores: CarbonScore[] = scoresData?.scores || []
        const recommendations: Recommendation[] = recommendationsData?.recommendations || []

        // Filter bills based on selected period
        const now = new Date()
        const filteredBills = bills.filter((bill: Bill) => {
          const billDate = new Date(bill.date)
          switch (selectedPeriod) {
            case '1month':
              return billDate >= new Date(now.getFullYear(), now.getMonth(), 1)
            case '3months':
              return billDate >= new Date(now.getFullYear(), now.getMonth() - 2, 1)
            case '6months':
              return billDate >= new Date(now.getFullYear(), now.getMonth() - 5, 1)
            default:
              return true
          }
        })

        // Calculate summary
        const totalCarbon = filteredBills.reduce((sum: number, bill: Bill) => sum + (bill.carbonEmission || 0), 0)
        const scannerEntries = filteredBills.filter((b: Bill) => b.entryMethod === 'scanner').length
        const manualEntries = filteredBills.filter((b: Bill) => b.entryMethod === 'manual' || !b.entryMethod).length

        // Group by month for trends
        const monthlyEmissions: Record<string, number> = {}
        filteredBills.forEach((bill: Bill) => {
          if (bill.month) {
            monthlyEmissions[bill.month] = (monthlyEmissions[bill.month] || 0) + (bill.carbonEmission || 0)
          }
        })

        const months = Object.entries(monthlyEmissions)
        const bestMonth = months.length > 0
          ? months.reduce((min, curr) => curr[1] < min[1] ? { month: curr[0], emission: curr[1] } : min, { month: months[0][0], emission: months[0][1] })
          : null
        const worstMonth = months.length > 0
          ? months.reduce((max, curr) => curr[1] > max[1] ? { month: curr[0], emission: curr[1] } : max, { month: months[0][0], emission: months[0][1] })
          : null

        // Calculate breakdown
        const breakdown = {
          electricity: 0,
          transport: 0,
          gas: 0,
          water: 0,
          other: 0,
        }

        filteredBills.forEach((bill: Bill) => {
          const emission = bill.carbonEmission || 0
          switch (bill.type) {
            case 'electricity':
              breakdown.electricity += emission
              break
            case 'petrol':
            case 'diesel':
              breakdown.transport += emission
              break
            case 'lpg':
            case 'gas':
              breakdown.gas += emission
              break
            case 'water':
              breakdown.water += emission
              break
            default:
              breakdown.other += emission
          }
        })

        setReportData({
          bills: filteredBills,
          scores,
          summary: {
            totalCarbon,
            totalBills: filteredBills.length,
            scannerEntries,
            manualEntries,
            avgMonthlyCarbon: months.length > 0 ? totalCarbon / months.length : 0,
            bestMonth,
            worstMonth,
          },
          breakdown,
          recommendations,
        })
      } catch (error) {
        console.error("Failed to fetch report data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [selectedPeriod])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!reportData) return

    // Extract user details from the most recent bill with userDetails
    let userDetails: { name?: string | null, phone?: string | null, consumerId?: string | null, address?: string | null } | null = null
    for (const bill of reportData.bills) {
      if (bill.extractedData) {
        try {
          const data = typeof bill.extractedData === 'string' ? JSON.parse(bill.extractedData) : bill.extractedData
          if (data.userDetails && (data.userDetails.name || data.userDetails.phone || data.userDetails.consumerId || data.userDetails.address)) {
            userDetails = data.userDetails
            break
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    const avgMonthly = reportData.summary.avgMonthlyCarbon
    const indiaAvg = 167 // kg CO2/month
    const globalAvg = 333 // kg CO2/month
    const parisTarget = 167 // kg CO2/month (2 tonnes/year per capita)

    let safetyStatus = ""
    let safetyLevel = ""
    if (avgMonthly <= parisTarget) {
      safetyStatus = "SAFE - Within sustainable limits"
      safetyLevel = "Your emissions are within the Paris Agreement targets."
    } else if (avgMonthly <= indiaAvg) {
      safetyStatus = "MODERATE - Within national average"
      safetyLevel = "Your emissions are above sustainable targets but within national average."
    } else if (avgMonthly <= globalAvg) {
      safetyStatus = "HIGH - Above national average"
      safetyLevel = "Your emissions exceed the national average. Action recommended."
    } else {
      safetyStatus = "CRITICAL - Significantly above global average"
      safetyLevel = "Your emissions are significantly high. Immediate action needed."
    }

    const report = `
╔════════════════════════════════════════════════════════════════════╗
║                   CARBON FOOTPRINT REPORT                          ║
║                    Sustainability Assessment                       ║
╚════════════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Period: ${selectedPeriod === 'all' ? 'All Time' : selectedPeriod}
Report ID: ${Date.now().toString(36).toUpperCase()}

${userDetails ? `────────────────────────────────────────────────────────────────────────

CUSTOMER INFORMATION
--------------------
${userDetails.name ? `Name: ${userDetails.name}` : ''}${userDetails.name ? '\n' : ''}${userDetails.phone ? `Phone: ${userDetails.phone}` : ''}${userDetails.phone ? '\n' : ''}${userDetails.consumerId ? `Consumer ID: ${userDetails.consumerId}` : ''}${userDetails.consumerId ? '\n' : ''}${userDetails.address ? `Address: ${userDetails.address}` : ''}${userDetails.address ? '\n' : ''}
` : ''}════════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
-----------------
Total Carbon Emissions: ${reportData.summary.totalCarbon.toFixed(2)} kg CO2
Total Bills Recorded: ${reportData.summary.totalBills}
Average Monthly Emissions: ${avgMonthly.toFixed(2)} kg CO2/month
Trees Needed to Offset: ${(reportData.summary.totalCarbon / 21).toFixed(1)} trees/year

════════════════════════════════════════════════════════════════════

SAFETY STATUS & SUSTAINABILITY ASSESSMENT
------------------------------------------
Status: ${safetyStatus}
Assessment: ${safetyLevel}

Your Monthly Average: ${avgMonthly.toFixed(2)} kg CO2
Paris Agreement Target: ${parisTarget} kg CO2/month (2 tonnes/year)
India National Average: ${indiaAvg} kg CO2/month
Global Average: ${globalAvg} kg CO2/month

Comparison with Standards:
  • vs Paris Target: ${avgMonthly > parisTarget ? '+' : ''}${((avgMonthly - parisTarget) / parisTarget * 100).toFixed(1)}%
  • vs India Average: ${avgMonthly > indiaAvg ? '+' : ''}${((avgMonthly - indiaAvg) / indiaAvg * 100).toFixed(1)}%
  • vs Global Average: ${avgMonthly > globalAvg ? '+' : ''}${((avgMonthly - globalAvg) / globalAvg * 100).toFixed(1)}%

════════════════════════════════════════════════════════════════════

GLOBAL SUSTAINABILITY INDEX
----------------------------

UN Sustainable Development Goals (SDG 13 - Climate Action):
  Target: Limit global warming to 1.5°C above pre-industrial levels
  Per Capita Budget: 2 tonnes CO2/year (~167 kg/month)
  Your Performance: ${avgMonthly <= parisTarget ? '✓ ON TRACK' : '✗ NEEDS IMPROVEMENT'}

Paris Agreement Alignment:
  2030 Target: 50% reduction from current levels
  Required Monthly Avg: ${parisTarget} kg CO2
  Current Gap: ${Math.max(0, avgMonthly - parisTarget).toFixed(2)} kg CO2/month

Global Carbon Budget (2026):
  Remaining Global Budget: ~300 Gt CO2 (for 1.5°C target)
  Individual Contribution: ${(reportData.summary.totalCarbon / 1000).toFixed(4)} tonnes

Sustainability Rating: ${avgMonthly <= parisTarget ? 'A (Excellent)' : avgMonthly <= indiaAvg ? 'B (Good)' : avgMonthly <= globalAvg ? 'C (Average)' : 'D (Needs Improvement)'}

════════════════════════════════════════════════════════════════════

DATA ENTRY METHODS
------------------
Scanner (OCR): ${reportData.summary.scannerEntries} entries (${(reportData.summary.scannerEntries / reportData.summary.totalBills * 100 || 0).toFixed(1)}%)
Manual Entry: ${reportData.summary.manualEntries} entries (${(reportData.summary.manualEntries / reportData.summary.totalBills * 100 || 0).toFixed(1)}%)

════════════════════════════════════════════════════════════════════

CARBON DEPOSIT BREAKDOWN BY CATEGORY
-------------------------------------
${[
  { name: 'Electricity', value: reportData.breakdown.electricity, icon: '⚡' },
  { name: 'Transport', value: reportData.breakdown.transport, icon: '🚗' },
  { name: 'Gas/LPG', value: reportData.breakdown.gas, icon: '🔥' },
  { name: 'Water', value: reportData.breakdown.water, icon: '💧' },
  { name: 'Other', value: reportData.breakdown.other, icon: '📦' },
].map(cat => {
  const percent = ((cat.value / reportData.summary.totalCarbon) * 100 || 0).toFixed(1)
  const bar = '█'.repeat(Math.floor(parseFloat(percent) / 5))
  return `${cat.icon} ${cat.name.padEnd(15)} ${cat.value.toFixed(2).padStart(8)} kg CO2  ${percent.padStart(5)}%  ${bar}`
}).join('\n')}

════════════════════════════════════════════════════════════════════

MONTHLY PERFORMANCE ANALYSIS
-----------------------------
Best Month: ${reportData.summary.bestMonth ? `${reportData.summary.bestMonth.month} (${reportData.summary.bestMonth.emission.toFixed(2)} kg CO2)` : 'N/A'}
Worst Month: ${reportData.summary.worstMonth ? `${reportData.summary.worstMonth.month} (${reportData.summary.worstMonth.emission.toFixed(2)} kg CO2)` : 'N/A'}

${reportData.summary.bestMonth && reportData.summary.worstMonth
  ? `Variation: ${((reportData.summary.worstMonth.emission - reportData.summary.bestMonth.emission) / reportData.summary.bestMonth.emission * 100).toFixed(1)}% difference`
  : ''}

════════════════════════════════════════════════════════════════════

ENVIRONMENTAL IMPACT EQUIVALENTS
---------------------------------
Your ${reportData.summary.totalCarbon.toFixed(1)} kg CO2 emissions are equivalent to:

  🌳 Trees: ${(reportData.summary.totalCarbon / 21).toFixed(1)} trees needed for 1 year
  🚗 Driving: ${(reportData.summary.totalCarbon / 0.21).toFixed(0)} km in a petrol car
  ❄️  Ice Melted: ${(reportData.summary.totalCarbon * 3).toFixed(0)} cm² of Arctic ice
  💡 Light Bulbs: ${(reportData.summary.totalCarbon * 10).toFixed(0)} hours of 60W bulb
  🎈 Balloons: ${(reportData.summary.totalCarbon * 509).toFixed(0)} balloons filled with CO2
  📱 Phone Charges: ${(reportData.summary.totalCarbon * 122).toFixed(0)} smartphone charges

════════════════════════════════════════════════════════════════════

WAYS TO REDUCE CARBON EMISSIONS
--------------------------------
Personalized Recommendations Based on Your Usage:

${reportData.recommendations.slice(0, 10).map((rec, idx) => `
${idx + 1}. ${rec.title.toUpperCase()}
   Category: ${rec.category.charAt(0).toUpperCase() + rec.category.slice(1)}
   Impact: ${rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1)}
   Potential Saving: ${rec.potentialSaving} kg CO2/month
   Difficulty: ${rec.difficulty.charAt(0).toUpperCase() + rec.difficulty.slice(1)}

   ${rec.description}
   `).join('\n')}

General Reduction Strategies:

ELECTRICITY (Current: ${reportData.breakdown.electricity.toFixed(1)} kg CO2):
  • Switch to LED bulbs (60-80% energy savings)
  • Unplug devices when not in use (phantom power = 10% of bill)
  • Use natural light during daytime
  • Set AC to 24°C instead of 18°C (saves 20% energy)
  • Install solar panels (100% renewable energy)

TRANSPORT (Current: ${reportData.breakdown.transport.toFixed(1)} kg CO2):
  • Use public transport (75% reduction vs car)
  • Carpool with colleagues (50% reduction)
  • Switch to electric/hybrid vehicles (60-80% reduction)
  • Cycle or walk for short distances (<5km)
  • Plan routes to avoid traffic congestion

GAS/LPG (Current: ${reportData.breakdown.gas.toFixed(1)} kg CO2):
  • Use pressure cooker (saves 50% gas)
  • Cover pots while cooking (30% faster)
  • Switch to induction cooking (more efficient)
  • Regular maintenance of gas stoves
  • Use renewable biogas alternatives

WATER (Current: ${reportData.breakdown.water.toFixed(1)} kg CO2):
  • Fix leaking taps immediately
  • Install water-efficient fixtures
  • Harvest rainwater
  • Reuse greywater for gardening
  • Take shorter showers (5 mins vs 10 mins)

════════════════════════════════════════════════════════════════════

DETAILED BILL HISTORY
----------------------
${reportData.bills.length} total records

Date          Type         Consumption        CO2 (kg)   Entry Method
${'─'.repeat(70)}
${reportData.bills.map(bill =>
  `${new Date(bill.date).toLocaleDateString().padEnd(14)}${bill.type.toUpperCase().padEnd(13)}${(bill.units + ' ' + bill.unitType).padEnd(19)}${bill.carbonEmission.toFixed(2).padStart(9)}   ${bill.entryMethod === 'scanner' ? 'SCANNED' : 'MANUAL'}`
).join('\n')}

════════════════════════════════════════════════════════════════════

APPENDIX: EMISSION FACTORS USED
--------------------------------
Electricity: 0.82 kg CO2/kWh (India Grid)
Petrol: 2.31 kg CO2/L
Diesel: 2.68 kg CO2/L
LPG: 1.51 kg CO2/L
Natural Gas: 2.0 kg CO2/kg
Water: 0.376 kg CO2/kL

════════════════════════════════════════════════════════════════════

REFERENCES & DATA SOURCES
--------------------------
1. IPCC Sixth Assessment Report (2021-2023)
2. Paris Agreement - United Nations Framework Convention on Climate Change
3. UN Sustainable Development Goals (SDG 13)
4. India's National Action Plan on Climate Change (NAPCC)
5. International Energy Agency (IEA) - CO2 Emissions Database
6. EPA Greenhouse Gas Equivalencies Calculator
7. Carbon Trust - Conversion Factors

════════════════════════════════════════════════════════════════════

NEXT STEPS & ACTION PLAN
-------------------------
1. Set monthly carbon budget: ${parisTarget} kg CO2
2. Focus on highest emission category: ${Object.entries(reportData.breakdown).sort((a, b) => b[1] - a[1])[0][0]}
3. Implement top 3 recommendations from above
4. Track progress monthly
5. Join carbon offset programs if needed

════════════════════════════════════════════════════════════════════

This report was generated by CarbonTrack - AI Carbon Footprint Calculator
For more information, visit: https://carbontrack.app
Support: support@carbontrack.app

© ${new Date().getFullYear()} CarbonTrack. All rights reserved.
    `.trim()

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `carbon-footprint-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <IconLeaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No data available for report generation.</p>
      </div>
    )
  }

  const totalCarbon = reportData.summary.totalCarbon

  return (
    <div className="space-y-6 print:space-y-4" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconChartBar className="h-6 w-6 text-green-500" />
            Carbon Footprint Report
          </h1>
          <p className="text-muted-foreground">Comprehensive analysis of your carbon emissions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'all' | '6months' | '3months' | '1month')}
          >
            <option value="all">All Time</option>
            <option value="6months">Last 6 Months</option>
            <option value="3months">Last 3 Months</option>
            <option value="1month">This Month</option>
          </select>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <IconPrinter className="h-4 w-4" />
            Print
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={handleDownload}>
            <IconDownload className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Carbon Footprint Report</h1>
        <p className="text-sm text-gray-600">
          Generated: {new Date().toLocaleDateString()} | Period: {selectedPeriod === 'all' ? 'All Time' : selectedPeriod}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Emissions</CardTitle>
            <IconLeaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCarbon.toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground">CO2 equivalent</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <IconCalendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalBills}</div>
            <p className="text-xs text-muted-foreground">Bills tracked</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <IconChartBar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.avgMonthlyCarbon.toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground">CO2 per month</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trees to Offset</CardTitle>
            <IconTree className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalCarbon / 21).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Trees per year needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Safety Status & Sustainability Assessment */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconShieldCheck className="h-5 w-5 text-green-500" />
            Safety Status & Sustainability Assessment
          </CardTitle>
          <CardDescription>Comparison with global standards and targets</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const avgMonthly = reportData.summary.avgMonthlyCarbon
            const indiaAvg = 167 // kg CO2/month
            const globalAvg = 333 // kg CO2/month
            const parisTarget = 167 // kg CO2/month (2 tonnes/year per capita)

            let statusIcon = <IconShieldCheck className="h-12 w-12 text-green-500" />
            let statusText = "SAFE"
            let statusDesc = "Within sustainable limits"
            let statusColor = "bg-green-500/10 border-green-500/20 text-green-500"

            if (avgMonthly <= parisTarget) {
              statusIcon = <IconShieldCheck className="h-12 w-12 text-green-500" />
              statusText = "SAFE"
              statusDesc = "Your emissions are within the Paris Agreement targets. Excellent work!"
              statusColor = "bg-green-500/10 border-green-500/20 text-green-500"
            } else if (avgMonthly <= indiaAvg) {
              statusIcon = <IconAlertTriangle className="h-12 w-12 text-yellow-500" />
              statusText = "MODERATE"
              statusDesc = "Above sustainable targets but within national average. Room for improvement."
              statusColor = "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
            } else if (avgMonthly <= globalAvg) {
              statusIcon = <IconAlertTriangle className="h-12 w-12 text-orange-500" />
              statusText = "HIGH"
              statusDesc = "Your emissions exceed the national average. Action recommended."
              statusColor = "bg-orange-500/10 border-orange-500/20 text-orange-500"
            } else {
              statusIcon = <IconShieldX className="h-12 w-12 text-red-500" />
              statusText = "CRITICAL"
              statusDesc = "Significantly above global average. Immediate action needed."
              statusColor = "bg-red-500/10 border-red-500/20 text-red-500"
            }

            return (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-6 rounded-lg border ${statusColor}`}>
                  <div className="flex items-center gap-4">
                    <div>{statusIcon}</div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold mb-1">{statusText}</div>
                      <div className="text-sm opacity-90">{statusDesc}</div>
                    </div>
                  </div>
                </div>

                {/* Comparison Metrics */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Your Monthly Avg</div>
                    <div className="text-2xl font-bold">{avgMonthly.toFixed(1)} kg</div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-sm text-muted-foreground mb-1">Paris Target</div>
                    <div className="text-2xl font-bold text-blue-500">{parisTarget} kg</div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-sm text-muted-foreground mb-1">India Average</div>
                    <div className="text-2xl font-bold text-purple-500">{indiaAvg} kg</div>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>vs Paris Agreement Target</span>
                      <span className={avgMonthly > parisTarget ? 'text-red-500' : 'text-green-500'}>
                        {avgMonthly > parisTarget ? '+' : ''}{((avgMonthly - parisTarget) / parisTarget * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (avgMonthly / parisTarget) * 100)}
                      className="h-2"
                      indicatorClassName={avgMonthly <= parisTarget ? 'bg-green-500' : 'bg-red-500'}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>vs India National Average</span>
                      <span className={avgMonthly > indiaAvg ? 'text-red-500' : 'text-green-500'}>
                        {avgMonthly > indiaAvg ? '+' : ''}{((avgMonthly - indiaAvg) / indiaAvg * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (avgMonthly / indiaAvg) * 100)}
                      className="h-2"
                      indicatorClassName={avgMonthly <= indiaAvg ? 'bg-green-500' : 'bg-orange-500'}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>vs Global Average</span>
                      <span className={avgMonthly > globalAvg ? 'text-red-500' : 'text-green-500'}>
                        {avgMonthly > globalAvg ? '+' : ''}{((avgMonthly - globalAvg) / globalAvg * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (avgMonthly / globalAvg) * 100)}
                      className="h-2"
                      indicatorClassName={avgMonthly <= globalAvg ? 'bg-green-500' : 'bg-red-500'}
                    />
                  </div>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Global Sustainability Index */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconWorld className="h-5 w-5 text-green-500" />
            Global Sustainability Index & Records
          </CardTitle>
          <CardDescription>Your contribution to global climate goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* SDG 13 - Climate Action */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <IconTarget className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold text-lg">UN SDG 13 - Climate Action</div>
                  <div className="text-sm text-muted-foreground">
                    Target: Limit global warming to 1.5°C above pre-industrial levels
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Per Capita Carbon Budget</div>
                  <div className="text-xl font-bold">2 tonnes CO2/year</div>
                  <div className="text-xs text-muted-foreground">(~167 kg/month)</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Your Performance</div>
                  <div className={`text-xl font-bold ${reportData.summary.avgMonthlyCarbon <= 167 ? 'text-green-500' : 'text-red-500'}`}>
                    {reportData.summary.avgMonthlyCarbon <= 167 ? '✓ ON TRACK' : '✗ NEEDS IMPROVEMENT'}
                  </div>
                </div>
              </div>
            </div>

            {/* Paris Agreement */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <IconWorldPin className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Paris Agreement Alignment</div>
                  <div className="text-sm text-muted-foreground">
                    2030 Target: 50% reduction in emissions from current levels
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Required Monthly Average</div>
                  <div className="text-xl font-bold">167 kg CO2</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Gap</div>
                  <div className="text-xl font-bold text-orange-500">
                    {Math.max(0, reportData.summary.avgMonthlyCarbon - 167).toFixed(2)} kg CO2/month
                  </div>
                </div>
              </div>
            </div>

            {/* Global Carbon Budget */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <IconChartBar className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Global Carbon Budget (2026)</div>
                  <div className="text-sm text-muted-foreground">
                    Remaining budget to limit warming to 1.5°C
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-sm text-muted-foreground">Remaining Global Budget</div>
                  <div className="text-xl font-bold">~300 Gt CO2</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Your Contribution</div>
                  <div className="text-xl font-bold">{(reportData.summary.totalCarbon / 1000).toFixed(4)} tonnes</div>
                </div>
              </div>
            </div>

            {/* Sustainability Rating */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Overall Sustainability Rating</div>
                <div className="text-5xl font-bold mb-2">
                  {reportData.summary.avgMonthlyCarbon <= 167 ? 'A' :
                   reportData.summary.avgMonthlyCarbon <= 250 ? 'B' :
                   reportData.summary.avgMonthlyCarbon <= 333 ? 'C' : 'D'}
                </div>
                <div className="text-sm">
                  {reportData.summary.avgMonthlyCarbon <= 167 ? 'Excellent - Carbon Neutral Path' :
                   reportData.summary.avgMonthlyCarbon <= 250 ? 'Good - Minor Improvements Needed' :
                   reportData.summary.avgMonthlyCarbon <= 333 ? 'Average - Significant Action Required' : 'Needs Improvement - Urgent Action Required'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ways to Reduce Carbon Emissions */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBulb className="h-5 w-5 text-green-500" />
            Ways to Reduce Your Carbon Footprint
          </CardTitle>
          <CardDescription>Personalized recommendations based on your usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.recommendations.length > 0 ? (
              <>
                <div className="grid gap-4">
                  {reportData.recommendations.slice(0, 6).map((rec, idx) => (
                    <div
                      key={rec.id}
                      className={`p-4 rounded-lg border ${
                        rec.impact === 'high'
                          ? 'bg-green-500/10 border-green-500/20'
                          : rec.impact === 'medium'
                          ? 'bg-blue-500/10 border-blue-500/20'
                          : 'bg-gray-500/10 border-gray-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center font-bold text-green-500">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-1">{rec.title}</div>
                          <div className="text-sm text-muted-foreground mb-3">{rec.description}</div>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 capitalize">
                              {rec.category}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs capitalize ${
                              rec.impact === 'high' ? 'bg-green-500/20 text-green-400' :
                              rec.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {rec.impact} impact
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 capitalize">
                              {rec.difficulty} difficulty
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">
                              Save {rec.potentialSaving} kg CO2/month
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Category-specific tips */}
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <IconBolt className="h-5 w-5 text-yellow-500" />
                      <div className="font-semibold">Electricity Tips</div>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Switch to LED bulbs (60-80% savings)</li>
                      <li>• Unplug devices when not in use</li>
                      <li>• Set AC to 24°C instead of 18°C</li>
                      <li>• Use natural light during daytime</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <IconCar className="h-5 w-5 text-blue-500" />
                      <div className="font-semibold">Transport Tips</div>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Use public transport (75% reduction)</li>
                      <li>• Carpool with colleagues</li>
                      <li>• Cycle or walk for short distances</li>
                      <li>• Plan routes to avoid traffic</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <IconFlame className="h-5 w-5 text-orange-500" />
                      <div className="font-semibold">Gas/LPG Tips</div>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Use pressure cooker (50% gas savings)</li>
                      <li>• Cover pots while cooking</li>
                      <li>• Switch to induction cooking</li>
                      <li>• Regular stove maintenance</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <IconDroplet className="h-5 w-5 text-cyan-500" />
                      <div className="font-semibold">Water Tips</div>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Fix leaking taps immediately</li>
                      <li>• Install water-efficient fixtures</li>
                      <li>• Harvest rainwater</li>
                      <li>• Take shorter showers (5 mins)</li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recommendations available yet. Keep tracking your emissions!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entry Method Stats */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconWorldPin className="h-5 w-5 text-green-500" />
            Data Entry Methods
          </CardTitle>
          <CardDescription>How your carbon data was captured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Scanner Entries */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <IconScan className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold">Scanner (OCR)</div>
                  <div className="text-sm text-muted-foreground">Bills scanned and auto-extracted</div>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-500">{reportData.summary.scannerEntries}</div>
                  <div className="text-sm text-muted-foreground">entries</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {reportData.summary.totalBills > 0
                      ? ((reportData.summary.scannerEntries / reportData.summary.totalBills) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">of total</div>
                </div>
              </div>
              <Progress
                value={reportData.summary.totalBills > 0
                  ? (reportData.summary.scannerEntries / reportData.summary.totalBills) * 100
                  : 0}
                className="mt-3 h-2"
                indicatorClassName="bg-blue-500"
              />
            </div>

            {/* Manual Entries */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <IconPencil className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <div className="font-semibold">Manual Entry</div>
                  <div className="text-sm text-muted-foreground">Bills entered manually</div>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-500">{reportData.summary.manualEntries}</div>
                  <div className="text-sm text-muted-foreground">entries</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {reportData.summary.totalBills > 0
                      ? ((reportData.summary.manualEntries / reportData.summary.totalBills) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">of total</div>
                </div>
              </div>
              <Progress
                value={reportData.summary.totalBills > 0
                  ? (reportData.summary.manualEntries / reportData.summary.totalBills) * 100
                  : 0}
                className="mt-3 h-2"
                indicatorClassName="bg-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown and Impact */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Emissions by Category</CardTitle>
            <CardDescription>Distribution of your carbon footprint</CardDescription>
          </CardHeader>
          <CardContent>
            <CarbonBreakdownChart
              data={{
                electricity: reportData.breakdown.electricity,
                transport: reportData.breakdown.transport,
                food: reportData.breakdown.gas,
                shopping: reportData.breakdown.other + reportData.breakdown.water,
              }}
              total={totalCarbon}
            />
          </CardContent>
        </Card>

        {/* Detailed Category Stats */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Category Details</CardTitle>
            <CardDescription>Breakdown of emissions by source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Electricity */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <IconBolt className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Electricity</span>
                    <span className="text-sm">{reportData.breakdown.electricity.toFixed(1)} kg</span>
                  </div>
                  <Progress
                    value={totalCarbon > 0 ? (reportData.breakdown.electricity / totalCarbon) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-yellow-500"
                  />
                </div>
              </div>

              {/* Transport */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <IconCar className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Transport</span>
                    <span className="text-sm">{reportData.breakdown.transport.toFixed(1)} kg</span>
                  </div>
                  <Progress
                    value={totalCarbon > 0 ? (reportData.breakdown.transport / totalCarbon) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-blue-500"
                  />
                </div>
              </div>

              {/* Gas/LPG */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <IconFlame className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Gas/LPG</span>
                    <span className="text-sm">{reportData.breakdown.gas.toFixed(1)} kg</span>
                  </div>
                  <Progress
                    value={totalCarbon > 0 ? (reportData.breakdown.gas / totalCarbon) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-orange-500"
                  />
                </div>
              </div>

              {/* Water */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <IconDroplet className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Water</span>
                    <span className="text-sm">{reportData.breakdown.water.toFixed(1)} kg</span>
                  </div>
                  <Progress
                    value={totalCarbon > 0 ? (reportData.breakdown.water / totalCarbon) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-cyan-500"
                  />
                </div>
              </div>

              {/* Other */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-500/20">
                  <IconLeaf className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Other</span>
                    <span className="text-sm">{reportData.breakdown.other.toFixed(1)} kg</span>
                  </div>
                  <Progress
                    value={totalCarbon > 0 ? (reportData.breakdown.other / totalCarbon) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-gray-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>Your best and worst months for carbon emissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Best Month */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <IconTrendingDown className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Best Month</span>
              </div>
              {reportData.summary.bestMonth ? (
                <>
                  <div className="text-2xl font-bold text-green-500">
                    {formatMonth(reportData.summary.bestMonth.month)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {reportData.summary.bestMonth.emission.toFixed(1)} kg CO2
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data available</div>
              )}
            </div>

            {/* Worst Month */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <IconTrendingUp className="h-5 w-5 text-red-500" />
                <span className="font-semibold">Highest Month</span>
              </div>
              {reportData.summary.worstMonth ? (
                <>
                  <div className="text-2xl font-bold text-red-500">
                    {formatMonth(reportData.summary.worstMonth.month)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {reportData.summary.worstMonth.emission.toFixed(1)} kg CO2
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data available</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Visualization */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Environmental Impact</CardTitle>
          <CardDescription>What your {totalCarbon.toFixed(1)} kg CO2 means for the planet</CardDescription>
        </CardHeader>
        <CardContent>
          <ImpactVisualization carbonKg={totalCarbon} />
        </CardContent>
      </Card>

      {/* Bill History Table */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Bill History</CardTitle>
          <CardDescription>Complete record of all tracked bills ({reportData.bills.length} entries)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Date</th>
                  <th className="text-left py-3 px-2 font-medium">Type</th>
                  <th className="text-left py-3 px-2 font-medium">Consumption</th>
                  <th className="text-left py-3 px-2 font-medium">CO2 (kg)</th>
                  <th className="text-left py-3 px-2 font-medium">Entry Method</th>
                </tr>
              </thead>
              <tbody>
                {reportData.bills.slice(0, 20).map((bill) => (
                  <tr key={bill.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">{new Date(bill.date).toLocaleDateString()}</td>
                    <td className="py-3 px-2 capitalize">{bill.type}</td>
                    <td className="py-3 px-2">{bill.units} {bill.unitType}</td>
                    <td className="py-3 px-2 font-medium text-green-500">{bill.carbonEmission.toFixed(2)}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        bill.entryMethod === 'scanner'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {bill.entryMethod === 'scanner' ? (
                          <>
                            <IconScan className="h-3 w-3" />
                            Scanner
                          </>
                        ) : (
                          <>
                            <IconPencil className="h-3 w-3" />
                            Manual
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.bills.length > 20 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Showing 20 of {reportData.bills.length} entries. Download full report for complete history.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .card, [class*="Card"] {
            border: 1px solid #e5e7eb !important;
            background: white !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
