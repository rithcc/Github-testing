"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CarbonScoreGauge } from "@/components/CarbonScoreGauge"
import { IconTrendingUp, IconTrendingDown, IconCalendar, IconLeaf, IconLoader2, IconBolt, IconCar, IconGasStation } from "@tabler/icons-react"
import { api } from "@/lib/api"

interface ScoreData {
  score: number
  totalEmission: number
  electricityEmission: number
  transportEmission: number
  gasEmission: number
  grade: string
  previousMonthChange: number | null
  nationalAverage: number
}

interface ScoreHistory {
  month: string
  score: number
  label: string
}

export default function ScorePage() {
  const [loading, setLoading] = useState(true)
  const [currentScore, setCurrentScore] = useState<ScoreData | null>(null)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // Get last 6 months of scores
        const { data } = await api.getCarbonScores({ limit: 6 })

        if (data?.scores && data.scores.length > 0) {
          // Current month score
          const current = data.scores[0]
          setCurrentScore({
            score: current.score ? current.score * 10 : 0, // Convert 0-100 to 0-1000
            totalEmission: current.totalEmission || 0,
            electricityEmission: current.electricityEmission || 0,
            transportEmission: current.transportEmission || 0,
            gasEmission: current.gasEmission || 0,
            grade: current.grade || 'N/A',
            previousMonthChange: current.previousMonthChange,
            nationalAverage: current.nationalAverage || 167
          })

          // Build history
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const history = data.scores.map((s: { month: string; score: number }) => {
            const [year, month] = s.month.split('-')
            return {
              month: s.month,
              score: s.score ? s.score * 10 : 0,
              label: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`
            }
          }).reverse() // Oldest first

          setScoreHistory(history)
        }
      } catch (error) {
        console.error("Failed to fetch score data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate score factors based on emissions
  const getScoreFactors = () => {
    if (!currentScore) return []

    const factors = []
    const avgElectricity = 80 // Average monthly kg CO2
    const avgTransport = 50
    const avgGas = 30

    // Electricity factor
    if (currentScore.electricityEmission > 0) {
      const diff = avgElectricity - currentScore.electricityEmission
      factors.push({
        name: currentScore.electricityEmission < avgElectricity ? "Low electricity usage" : "High electricity usage",
        impact: diff > 0 ? `+${Math.round(diff / 2)}` : `${Math.round(diff / 2)}`,
        positive: diff > 0,
        icon: IconBolt
      })
    }

    // Transport factor
    if (currentScore.transportEmission > 0) {
      const diff = avgTransport - currentScore.transportEmission
      factors.push({
        name: currentScore.transportEmission < avgTransport ? "Low transport emissions" : "High transport emissions",
        impact: diff > 0 ? `+${Math.round(diff / 2)}` : `${Math.round(diff / 2)}`,
        positive: diff > 0,
        icon: IconCar
      })
    }

    // Gas factor
    if (currentScore.gasEmission > 0) {
      const diff = avgGas - currentScore.gasEmission
      factors.push({
        name: currentScore.gasEmission < avgGas ? "Efficient gas usage" : "High gas consumption",
        impact: diff > 0 ? `+${Math.round(diff / 2)}` : `${Math.round(diff / 2)}`,
        positive: diff > 0,
        icon: IconGasStation
      })
    }

    // National average comparison
    if (currentScore.totalEmission > 0) {
      const diff = currentScore.nationalAverage - currentScore.totalEmission
      factors.push({
        name: diff > 0 ? "Below national average" : "Above national average",
        impact: diff > 0 ? `+${Math.round(Math.abs(diff) / 3)}` : `-${Math.round(Math.abs(diff) / 3)}`,
        positive: diff > 0,
        icon: IconLeaf
      })
    }

    return factors
  }

  const factors = getScoreFactors()

  // Calculate improvement
  const getImprovement = () => {
    if (scoreHistory.length < 2) return null
    const oldest = scoreHistory[0].score
    const newest = scoreHistory[scoreHistory.length - 1].score
    return newest - oldest
  }

  const improvement = getImprovement()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  // Empty state
  if (!currentScore || currentScore.score === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Carbon Score</h1>
          <p className="text-muted-foreground">Your environmental impact rating</p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-12 text-center">
            <IconLeaf className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Score Data Yet</h3>
            <p className="text-muted-foreground">
              Upload your bills to calculate your carbon score
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carbon Score</h1>
        <p className="text-muted-foreground">Your environmental impact rating</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Score */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Your Current Score</CardTitle>
            <CardDescription>Based on last 30 days of activity</CardDescription>
          </CardHeader>
          <CardContent>
            <CarbonScoreGauge score={currentScore.score} />
            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground">
                Total emissions: {currentScore.totalEmission.toFixed(1)} kg CO2
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Score Factors */}
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Score Factors</CardTitle>
            <CardDescription>What affects your score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {factors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No emission data to analyze yet</p>
              </div>
            ) : (
              factors.map((factor, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    factor.positive ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {factor.positive ? (
                      <IconTrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <IconTrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{factor.name}</span>
                  </div>
                  <span className={`font-medium ${factor.positive ? 'text-green-500' : 'text-red-500'}`}>
                    {factor.impact}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score History */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="h-5 w-5" />
            Score History
          </CardTitle>
          <CardDescription>Your score progression over time</CardDescription>
        </CardHeader>
        <CardContent>
          {scoreHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No history available yet. Keep tracking to see your progress!</p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between h-48 gap-4">
                {scoreHistory.map((item, index) => {
                  const height = Math.max((item.score / 1000) * 100, 5)
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-medium">{item.score}</span>
                      <div
                        className="w-full bg-green-500 rounded-t-md transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  )
                })}
              </div>
              {improvement !== null && (
                <div className="mt-4 text-center">
                  <span className={`text-sm ${improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {improvement >= 0 ? '+' : ''}{improvement} points change over {scoreHistory.length} months
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tips to Improve */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconLeaf className="h-5 w-5 text-green-500" />
            How to Improve Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Quick Wins (+10-30 points)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Switch to LED bulbs</li>
                <li>• Unplug devices when not in use</li>
                <li>• Use reusable shopping bags</li>
                <li>• Reduce food waste</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Major Impact (+50-100 points)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Switch to renewable energy</li>
                <li>• Use public transport regularly</li>
                <li>• Reduce meat consumption</li>
                <li>• Avoid short-haul flights</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
