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

        const bills: Bill[] = billsData?.bills || []
        const scores: CarbonScore[] = scoresData?.scores || []

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

    const report = `
CARBON FOOTPRINT REPORT
========================
Generated: ${new Date().toLocaleDateString()}
Period: ${selectedPeriod === 'all' ? 'All Time' : selectedPeriod}

SUMMARY
-------
Total Carbon Emissions: ${reportData.summary.totalCarbon.toFixed(2)} kg CO2
Total Bills Recorded: ${reportData.summary.totalBills}
Average Monthly Emissions: ${reportData.summary.avgMonthlyCarbon.toFixed(2)} kg CO2

ENTRY METHODS
-------------
Scanner (OCR): ${reportData.summary.scannerEntries} entries
Manual Entry: ${reportData.summary.manualEntries} entries

BREAKDOWN BY CATEGORY
---------------------
Electricity: ${reportData.breakdown.electricity.toFixed(2)} kg CO2 (${((reportData.breakdown.electricity / reportData.summary.totalCarbon) * 100 || 0).toFixed(1)}%)
Transport: ${reportData.breakdown.transport.toFixed(2)} kg CO2 (${((reportData.breakdown.transport / reportData.summary.totalCarbon) * 100 || 0).toFixed(1)}%)
Gas/LPG: ${reportData.breakdown.gas.toFixed(2)} kg CO2 (${((reportData.breakdown.gas / reportData.summary.totalCarbon) * 100 || 0).toFixed(1)}%)
Water: ${reportData.breakdown.water.toFixed(2)} kg CO2 (${((reportData.breakdown.water / reportData.summary.totalCarbon) * 100 || 0).toFixed(1)}%)
Other: ${reportData.breakdown.other.toFixed(2)} kg CO2 (${((reportData.breakdown.other / reportData.summary.totalCarbon) * 100 || 0).toFixed(1)}%)

MONTHLY ANALYSIS
----------------
Best Month: ${reportData.summary.bestMonth ? `${reportData.summary.bestMonth.month} (${reportData.summary.bestMonth.emission.toFixed(2)} kg CO2)` : 'N/A'}
Worst Month: ${reportData.summary.worstMonth ? `${reportData.summary.worstMonth.month} (${reportData.summary.worstMonth.emission.toFixed(2)} kg CO2)` : 'N/A'}

ENVIRONMENTAL IMPACT
--------------------
Trees needed to offset: ${(reportData.summary.totalCarbon / 21).toFixed(1)} trees/year
Equivalent driving distance: ${(reportData.summary.totalCarbon / 0.21).toFixed(0)} km

DETAILED BILL HISTORY
---------------------
${reportData.bills.map(bill =>
  `${new Date(bill.date).toLocaleDateString()} | ${bill.type.toUpperCase()} | ${bill.units} ${bill.unitType} | ${bill.carbonEmission.toFixed(2)} kg CO2 | ${bill.entryMethod === 'scanner' ? 'SCANNED' : 'MANUAL'}`
).join('\n')}

========================
Report generated by CarbonTrack
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
