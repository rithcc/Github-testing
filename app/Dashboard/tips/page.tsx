"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconBulb, IconBolt, IconCar, IconMeat, IconLeaf, IconLoader2, IconRecycle } from "@tabler/icons-react"
import { api } from "@/lib/api"

interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  impact: string
  potentialSaving: number
  difficulty: string
}

interface CategoryGroup {
  category: string
  icon: typeof IconBolt
  color: string
  bg: string
  tips: Recommendation[]
}

const getCategoryStyle = (category: string) => {
  switch (category.toLowerCase()) {
    case "energy":
      return { icon: IconBolt, color: "text-yellow-500", bg: "bg-yellow-500/10" }
    case "transport":
      return { icon: IconCar, color: "text-blue-500", bg: "bg-blue-500/10" }
    case "diet":
    case "food":
      return { icon: IconMeat, color: "text-orange-500", bg: "bg-orange-500/10" }
    case "lifestyle":
      return { icon: IconLeaf, color: "text-purple-500", bg: "bg-purple-500/10" }
    default:
      return { icon: IconLeaf, color: "text-green-500", bg: "bg-green-500/10" }
  }
}

export default function TipsPage() {
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.getRecommendations()
        if (data?.recommendations) {
          setRecommendations(data.recommendations)
        }
      } catch (error) {
        console.error("Failed to fetch tips:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Group recommendations by category
  const groupedTips: CategoryGroup[] = recommendations.reduce((acc, rec) => {
    const existingGroup = acc.find(g => g.category.toLowerCase() === rec.category.toLowerCase())
    if (existingGroup) {
      existingGroup.tips.push(rec)
    } else {
      const style = getCategoryStyle(rec.category)
      acc.push({
        category: rec.category.charAt(0).toUpperCase() + rec.category.slice(1),
        icon: style.icon,
        color: style.color,
        bg: style.bg,
        tips: [rec]
      })
    }
    return acc
  }, [] as CategoryGroup[])

  // Calculate total potential savings (monthly * 12 for yearly)
  const totalSavings = recommendations.reduce((sum, r) => sum + (r.potentialSaving * 12), 0)
  const treesEquivalent = Math.round(totalSavings / 21) // ~21 kg CO2 per tree per year

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconBulb className="h-6 w-6 text-green-500" />
            Eco Tips
          </h1>
          <p className="text-muted-foreground">Simple ways to reduce your carbon footprint</p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-12 text-center">
            <IconBulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Tips Available</h3>
            <p className="text-muted-foreground mb-4">
              Tips haven&apos;t been set up yet. Run the database seed to add recommendations.
            </p>
            <code className="text-sm bg-muted px-3 py-1 rounded">npm run db:seed</code>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconBulb className="h-6 w-6 text-green-500" />
          Eco Tips
        </h1>
        <p className="text-muted-foreground">Simple ways to reduce your carbon footprint</p>
      </div>

      {/* Quick Stats */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconRecycle className="h-5 w-5 text-green-500" />
            Potential Savings
          </CardTitle>
          <CardDescription>If you follow all these tips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-500">{totalSavings.toLocaleString()} kg CO2/year</div>
          <p className="text-muted-foreground mt-2">That&apos;s equivalent to planting {treesEquivalent} trees!</p>
        </CardContent>
      </Card>

      {/* Tips by Category */}
      <div className="grid gap-6 md:grid-cols-2">
        {groupedTips.map((category) => (
          <Card key={category.category} className={`bg-card/50 backdrop-blur border-l-4 ${category.color.replace('text-', 'border-')}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className={`h-5 w-5 ${category.color}`} />
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.tips.map((tip) => (
                <div key={tip.id} className={`p-3 rounded-lg ${category.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{tip.title}</span>
                    <span className={`text-sm font-semibold ${category.color}`}>
                      {tip.potentialSaving * 12} kg/year
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{tip.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      tip.impact === "high"
                        ? "bg-red-500/10 text-red-500"
                        : tip.impact === "medium"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-green-500/10 text-green-500"
                    }`}>
                      {tip.impact} impact
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      tip.difficulty === "easy"
                        ? "bg-green-500/10 text-green-500"
                        : tip.difficulty === "medium"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {tip.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
