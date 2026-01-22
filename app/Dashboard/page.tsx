"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  IconLeaf,
  IconBolt,
  IconCar,
  IconShoppingBag,
  IconMeat,
  IconTrendingUp,
  IconTrendingDown,
  IconPlant,
  IconUpload,
  IconLoader2
} from "@tabler/icons-react"
import Link from "next/link"
import { CarbonScoreGauge } from "@/components/CarbonScoreGauge"
import { CarbonBreakdownChart } from "@/components/CarbonBreakdownChart"
import { ImpactVisualization } from "@/components/ImpactVisualization"
import { api } from "@/lib/api"

interface CarbonData {
  totalMonthly: number
  previousMonth: number
  score: number
  breakdown: {
    electricity: number
    transport: number
    food: number
    shopping: number
  }
  budget: {
    total: number
    used: number
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [carbonData, setCarbonData] = useState<CarbonData>({
    totalMonthly: 0,
    previousMonth: 0,
    score: 0,
    breakdown: {
      electricity: 0,
      transport: 0,
      food: 0,
      shopping: 0
    },
    budget: {
      total: 300,
      used: 0
    }
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Get carbon scores
        const { data: scoreData } = await api.getCarbonScores({ limit: 2 })

        // Get current month budget
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const { data: budgetData } = await api.getCarbonBudget(currentMonth)

        if (scoreData?.scores && scoreData.scores.length > 0) {
          const current = scoreData.scores[0]
          const previous = scoreData.scores[1]

          setCarbonData({
            totalMonthly: current.totalEmission || 0,
            previousMonth: previous?.totalEmission || current.totalEmission || 0,
            score: current.score ? current.score * 10 : 500, // Convert 0-100 to 0-1000 scale
            breakdown: {
              electricity: current.electricityEmission || 0,
              transport: current.transportEmission || 0,
              food: 0, // Not tracked yet
              shopping: current.otherEmission || 0
            },
            budget: {
              total: budgetData?.budget?.targetEmission || 300,
              used: current.totalEmission || 0
            }
          })
        }
      } catch (error) {
        console.error("Failed to fetch carbon data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const percentChange = carbonData.previousMonth > 0
    ? ((carbonData.previousMonth - carbonData.totalMonthly) / carbonData.previousMonth * 100).toFixed(1)
    : "0"
  const isReduction = carbonData.totalMonthly < carbonData.previousMonth

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Carbon Dashboard</h1>
          <p className="text-muted-foreground">Track and reduce your carbon footprint</p>
        </div>
        <Link href="/Dashboard/upload">
          <Button className="bg-green-600 hover:bg-green-700 gap-2">
            <IconUpload className="h-4 w-4" />
            Upload Bill
          </Button>
        </Link>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Monthly */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20 card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Footprint</CardTitle>
            <IconLeaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carbonData.totalMonthly} kg</div>
            <div className={`text-xs flex items-center gap-1 ${isReduction ? 'text-green-500' : 'text-red-500'}`}>
              {isReduction ? <IconTrendingDown className="h-3 w-3" /> : <IconTrendingUp className="h-3 w-3" />}
              {percentChange}% vs last month
            </div>
          </CardContent>
        </Card>

        {/* Electricity */}
        <Card className="bg-card/50 backdrop-blur border-yellow-500/20 card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Electricity</CardTitle>
            <IconBolt className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carbonData.breakdown.electricity} kg</div>
            <div className="text-xs text-muted-foreground">
              {carbonData.totalMonthly > 0
                ? `${((carbonData.breakdown.electricity / carbonData.totalMonthly) * 100).toFixed(0)}% of total`
                : "No data yet"}
            </div>
          </CardContent>
        </Card>

        {/* Transport */}
        <Card className="bg-card/50 backdrop-blur border-blue-500/20 card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transport</CardTitle>
            <IconCar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carbonData.breakdown.transport} kg</div>
            <div className="text-xs text-muted-foreground">
              {carbonData.totalMonthly > 0
                ? `${((carbonData.breakdown.transport / carbonData.totalMonthly) * 100).toFixed(0)}% of total`
                : "No data yet"}
            </div>
          </CardContent>
        </Card>

        {/* Food */}
        <Card className="bg-card/50 backdrop-blur border-orange-500/20 card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Food</CardTitle>
            <IconMeat className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{carbonData.breakdown.food} kg</div>
            <div className="text-xs text-muted-foreground">
              {carbonData.totalMonthly > 0
                ? `${((carbonData.breakdown.food / carbonData.totalMonthly) * 100).toFixed(0)}% of total`
                : "No data yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Score and Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Carbon Score */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPlant className="h-5 w-5 text-green-500" />
              Your Carbon Score
            </CardTitle>
            <CardDescription>Like a credit score, but for the planet</CardDescription>
          </CardHeader>
          <CardContent>
            <CarbonScoreGauge score={carbonData.score} />
          </CardContent>
        </Card>

        {/* Breakdown Chart */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Where your carbon comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <CarbonBreakdownChart data={carbonData.breakdown} total={carbonData.totalMonthly} />
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Budget and Impact */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Carbon Budget */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Carbon Budget</CardTitle>
            <CardDescription>Monthly budget: {carbonData.budget.total} kg CO2</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {carbonData.budget.used} kg</span>
                <span>Remaining: {carbonData.budget.total - carbonData.budget.used} kg</span>
              </div>
              <Progress
                value={(carbonData.budget.used / carbonData.budget.total) * 100}
                className="h-3"
                indicatorClassName="bg-green-500"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {carbonData.budget.used === 0
                ? "Upload bills to start tracking your carbon budget"
                : `You're ${carbonData.budget.total - carbonData.budget.used} kg under budget this month!`}
            </div>
          </CardContent>
        </Card>

        {/* Impact Visualization */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Your Impact Visualized</CardTitle>
            <CardDescription>What your {carbonData.totalMonthly} kg CO2 means</CardDescription>
          </CardHeader>
          <CardContent>
            <ImpactVisualization carbonKg={carbonData.totalMonthly} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Recommendations */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconLeaf className="h-5 w-5 text-green-500" />
            Quick Tips to Reduce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="font-medium mb-1">Switch to LED Bulbs</div>
              <div className="text-sm text-muted-foreground">Save up to 50 kg CO2/year</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="font-medium mb-1">Carpool 2x/week</div>
              <div className="text-sm text-muted-foreground">Save up to 200 kg CO2/year</div>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="font-medium mb-1">Meatless Mondays</div>
              <div className="text-sm text-muted-foreground">Save up to 100 kg CO2/year</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
