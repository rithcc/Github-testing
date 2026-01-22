"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconPlant, IconTree, IconCar, IconPlane, IconDroplet, IconFlame, IconLoader2, IconLeaf } from "@tabler/icons-react"
import { api } from "@/lib/api"

export default function ImpactPage() {
  const [loading, setLoading] = useState(true)
  const [carbonKg, setCarbonKg] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const { data } = await api.getCarbonScores({ month: currentMonth })
        const score = data?.score || data?.scores?.[0]

        if (score) {
          setCarbonKg(score.totalEmission || 0)
        }
      } catch (error) {
        console.error("Failed to fetch carbon data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const impactMetrics = [
    {
      title: "Trees Needed",
      value: carbonKg > 0 ? Math.ceil(carbonKg / 21) : 0,
      unit: "trees/year",
      description: "To absorb your monthly emissions",
      icon: IconTree,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      title: "Driving Equivalent",
      value: Math.round(carbonKg * 4),
      unit: "km",
      description: "Same as driving this distance",
      icon: IconCar,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Flight Equivalent",
      value: carbonKg > 0 ? (carbonKg / 250).toFixed(1) : "0",
      unit: "hours",
      description: "Equivalent flight time",
      icon: IconPlane,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Water Usage",
      value: Math.round(carbonKg * 100),
      unit: "liters",
      description: "Water footprint equivalent",
      icon: IconDroplet,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10"
    },
    {
      title: "Coal Burned",
      value: carbonKg > 0 ? Math.round(carbonKg / 2.4) : 0,
      unit: "kg",
      description: "Coal equivalent burned",
      icon: IconFlame,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      title: "Forest Area",
      value: carbonKg > 0 ? Math.round(carbonKg / 5) : 0,
      unit: "m²/year",
      description: "Forest needed to offset",
      icon: IconPlant,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  // Empty state
  if (carbonKg === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconPlant className="h-6 w-6 text-green-500" />
            Environmental Impact
          </h1>
          <p className="text-muted-foreground">Understand what your carbon footprint really means</p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-12 text-center">
            <IconLeaf className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Impact Data Yet</h3>
            <p className="text-muted-foreground">
              Upload your bills to see your environmental impact visualization
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
          <IconPlant className="h-6 w-6 text-green-500" />
          Environmental Impact
        </h1>
        <p className="text-muted-foreground">Understand what your carbon footprint really means</p>
      </div>

      {/* Main Impact Card */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Your Monthly Impact</CardTitle>
          <CardDescription>What {carbonKg.toFixed(1)} kg of CO2 looks like in real terms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {impactMetrics.map((metric) => (
              <div key={metric.title} className={`p-4 rounded-xl ${metric.bg} border border-white/10`}>
                <div className="flex items-center gap-3 mb-3">
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                  <div>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.unit}</div>
                  </div>
                </div>
                <div className="font-medium text-sm">{metric.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Card */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>How You Compare</CardTitle>
          <CardDescription>Your footprint vs global averages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">Your Monthly Footprint</div>
                <div className="text-sm text-muted-foreground">Current emissions</div>
              </div>
              <div className={`text-2xl font-bold ${carbonKg <= 200 ? 'text-green-500' : carbonKg <= 400 ? 'text-yellow-500' : 'text-red-500'}`}>
                {carbonKg.toFixed(1)} kg
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">India Average</div>
                <div className="text-sm text-muted-foreground">Per person monthly</div>
              </div>
              <div className="text-2xl font-bold">167 kg</div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">Global Average</div>
                <div className="text-sm text-muted-foreground">Per person monthly</div>
              </div>
              <div className="text-2xl font-bold">400 kg</div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">Target for 2030</div>
                <div className="text-sm text-muted-foreground">Paris Agreement goal</div>
              </div>
              <div className="text-2xl font-bold text-green-500">200 kg</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
