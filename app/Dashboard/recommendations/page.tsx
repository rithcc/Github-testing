"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  IconBulb,
  IconBolt,
  IconCar,
  IconMeat,
  IconShoppingBag,
  IconLeaf,
  IconArrowRight,
  IconLoader2
} from "@tabler/icons-react"
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

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "energy": return { icon: IconBolt, color: "yellow" }
    case "transport": return { icon: IconCar, color: "blue" }
    case "diet": return { icon: IconMeat, color: "orange" }
    case "lifestyle": return { icon: IconShoppingBag, color: "purple" }
    default: return { icon: IconLeaf, color: "green" }
  }
}

export default function RecommendationsPage() {
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
        console.error("Failed to fetch recommendations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const alternatives = [
    {
      current: { name: "Beef (1kg)", carbon: 27 },
      alternatives: [
        { name: "Chicken (1kg)", carbon: 6.9, savings: 20.1 },
        { name: "Tofu (1kg)", carbon: 2.0, savings: 25 },
        { name: "Lentils (1kg)", carbon: 0.9, savings: 26.1 },
      ]
    },
    {
      current: { name: "Car (10km)", carbon: 1.92 },
      alternatives: [
        { name: "Bus (10km)", carbon: 0.89, savings: 1.03 },
        { name: "Train (10km)", carbon: 0.41, savings: 1.51 },
        { name: "Bicycle (10km)", carbon: 0, savings: 1.92 },
      ]
    }
  ]

  const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSaving, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Recommendations</h1>
        <p className="text-muted-foreground">
          Personalized tips to reduce your carbon footprint
        </p>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Potential Annual Savings</h3>
              <p className="text-3xl font-bold text-green-500">
                {totalPotentialSavings} kg CO2
              </p>
              <p className="text-sm text-muted-foreground">
                By following our recommendations
              </p>
            </div>
            <IconLeaf className="h-16 w-16 text-green-500/50" />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recommended Actions</h2>
        {recommendations.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur border-green-500/20">
            <CardContent className="py-8 text-center text-muted-foreground">
              <IconLeaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recommendations available yet.</p>
              <p className="text-sm">Upload some bills to get personalized recommendations!</p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((rec) => {
            const { icon: Icon, color } = getCategoryIcon(rec.category)

            return (
              <Card key={rec.id} className="bg-card/50 backdrop-blur border-green-500/20">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-${color}-500/10`}>
                      <Icon className={`h-6 w-6 text-${color}-500`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{rec.title}</h3>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                          rec.impact === "high"
                            ? "bg-red-500/10 text-red-500"
                            : rec.impact === "medium"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-green-500/10 text-green-500"
                        }`}>
                          {rec.impact} impact
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <IconLeaf className="h-4 w-4 text-green-500" />
                          <span className="text-green-500 font-medium">{rec.potentialSaving} kg CO2/month</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs capitalize ${
                          rec.difficulty === "easy"
                            ? "bg-green-500/10 text-green-500"
                            : rec.difficulty === "medium"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                        }`}>
                          {rec.difficulty}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Alternatives Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Smart Alternatives</h2>
        {alternatives.map((alt, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Instead of {alt.current.name} ({alt.current.carbon} kg CO2)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alt.alternatives.map((option, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">{option.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({option.carbon} kg CO2)
                      </span>
                    </div>
                    <span className="text-green-500 font-medium">
                      Save {option.savings.toFixed(1)} kg
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
