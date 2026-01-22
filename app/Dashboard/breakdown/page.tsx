"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconChartBar, IconBolt, IconCar, IconGasStation, IconDroplet, IconLeaf, IconLoader2 } from "@tabler/icons-react"
import { api } from "@/lib/api"

interface BreakdownItem {
  category: string
  amount: number
  percentage: number
  icon: typeof IconBolt
  color: string
  bg: string
  tip: string
}

export default function BreakdownPage() {
  const [loading, setLoading] = useState(true)
  const [totalCarbon, setTotalCarbon] = useState(0)
  const [breakdownData, setBreakdownData] = useState<BreakdownItem[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const { data } = await api.getCarbonScores({ month: currentMonth })
        const score = data?.score || data?.scores?.[0]

        if (score) {
          const total = score.totalEmission || 0
          setTotalCarbon(total)

          const items: BreakdownItem[] = []

          if (score.electricityEmission > 0 || total === 0) {
            items.push({
              category: "Electricity",
              amount: score.electricityEmission || 0,
              percentage: total > 0 ? Math.round((score.electricityEmission / total) * 100) : 0,
              icon: IconBolt,
              color: "text-yellow-500",
              bg: "bg-yellow-500/10",
              tip: "Consider switching to renewable energy sources"
            })
          }

          if (score.transportEmission > 0 || total === 0) {
            items.push({
              category: "Transport",
              amount: score.transportEmission || 0,
              percentage: total > 0 ? Math.round((score.transportEmission / total) * 100) : 0,
              icon: IconCar,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
              tip: "Try carpooling or public transport"
            })
          }

          if (score.gasEmission > 0) {
            items.push({
              category: "Gas/LPG",
              amount: score.gasEmission || 0,
              percentage: total > 0 ? Math.round((score.gasEmission / total) * 100) : 0,
              icon: IconGasStation,
              color: "text-orange-500",
              bg: "bg-orange-500/10",
              tip: "Use energy-efficient cooking methods"
            })
          }

          if (score.waterEmission > 0) {
            items.push({
              category: "Water",
              amount: score.waterEmission || 0,
              percentage: total > 0 ? Math.round((score.waterEmission / total) * 100) : 0,
              icon: IconDroplet,
              color: "text-cyan-500",
              bg: "bg-cyan-500/10",
              tip: "Reduce water wastage and fix leaks"
            })
          }

          if (score.otherEmission > 0) {
            items.push({
              category: "Other",
              amount: score.otherEmission || 0,
              percentage: total > 0 ? Math.round((score.otherEmission / total) * 100) : 0,
              icon: IconLeaf,
              color: "text-green-500",
              bg: "bg-green-500/10",
              tip: "Review and optimize your consumption"
            })
          }

          setBreakdownData(items)
        }
      } catch (error) {
        console.error("Failed to fetch breakdown data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  // Empty state
  if (totalCarbon === 0 && breakdownData.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconChartBar className="h-6 w-6 text-green-500" />
            Carbon Breakdown
          </h1>
          <p className="text-muted-foreground">See where your carbon footprint comes from</p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-12 text-center">
            <IconLeaf className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Data Yet</h3>
            <p className="text-muted-foreground">
              Upload your bills to see your carbon breakdown by category
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconChartBar className="h-6 w-6 text-green-500" />
          Carbon Breakdown
        </h1>
        <p className="text-muted-foreground">See where your carbon footprint comes from</p>
      </div>

      {/* Total Summary */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Total Monthly Emissions</CardTitle>
          <CardDescription>Your carbon footprint breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-500 mb-4">{totalCarbon.toFixed(1)} kg CO2</div>

          {/* Progress bars */}
          <div className="space-y-4">
            {breakdownData.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="font-medium">{item.category}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.amount.toFixed(1)} kg ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  {item.amount > 0 && (
                    <div
                      className={`h-full ${item.color.replace('text-', 'bg-')} transition-all duration-500`}
                      style={{ width: `${Math.max(item.percentage, 1)}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {breakdownData.filter(item => item.amount > 0).map((item) => (
          <Card key={item.category} className={`bg-card/50 backdrop-blur border-l-4 ${item.color.replace('text-', 'border-')}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{item.category}</CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.amount.toFixed(1)} kg</div>
              <p className="text-xs text-muted-foreground mt-1">
                {item.percentage}% of your total footprint
              </p>
              <div className={`mt-3 p-2 rounded-lg ${item.bg}`}>
                <p className="text-xs">{item.tip}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
