"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  IconTarget,
  IconBolt,
  IconCar,
  IconGasStation,
  IconAlertTriangle,
  IconCheck,
  IconSettings,
  IconLoader2
} from "@tabler/icons-react"
import { api } from "@/lib/api"

interface BudgetData {
  total: number
  used: number
  electricityUsed: number
  transportUsed: number
  gasUsed: number
}

export default function BudgetPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [budget, setBudget] = useState<BudgetData>({
    total: 300,
    used: 0,
    electricityUsed: 0,
    transportUsed: 0,
    gasUsed: 0
  })
  const [newBudget, setNewBudget] = useState("300")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Get budget for current month
      const { data: budgetData } = await api.getCarbonBudget(currentMonth)

      // Get carbon score for current month
      const { data: scoreData } = await api.getCarbonScores({ month: currentMonth })

      const score = scoreData?.score || scoreData?.scores?.[0]

      setBudget({
        total: budgetData?.budget?.targetEmission || 300,
        used: score?.totalEmission || 0,
        electricityUsed: score?.electricityEmission || 0,
        transportUsed: score?.transportEmission || 0,
        gasUsed: score?.gasEmission || 0
      })

      setNewBudget(String(budgetData?.budget?.targetEmission || 300))
    } catch (error) {
      console.error("Failed to fetch budget data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveBudget() {
    setSaving(true)
    try {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const { error } = await api.setCarbonBudget({
        month: currentMonth,
        targetEmission: parseFloat(newBudget) || 300
      })

      if (!error) {
        setBudget(prev => ({ ...prev, total: parseFloat(newBudget) || 300 }))
      }
    } catch (error) {
      console.error("Failed to save budget:", error)
    } finally {
      setSaving(false)
    }
  }

  const categories = [
    {
      name: "Electricity",
      icon: IconBolt,
      color: "yellow",
      allocated: budget.total * 0.4,
      used: budget.electricityUsed,
    },
    {
      name: "Transport",
      icon: IconCar,
      color: "blue",
      allocated: budget.total * 0.35,
      used: budget.transportUsed,
    },
    {
      name: "Gas/LPG",
      icon: IconGasStation,
      color: "orange",
      allocated: budget.total * 0.25,
      used: budget.gasUsed,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Carbon Budget</h1>
          <p className="text-muted-foreground">Manage your monthly carbon allowance</p>
        </div>
        <Button variant="outline">
          <IconSettings className="h-4 w-4 mr-2" />
          Adjust Budget
        </Button>
      </div>

      {/* Overall Budget */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTarget className="h-5 w-5 text-green-500" />
            Monthly Budget Overview
          </CardTitle>
          <CardDescription>Budget: {budget.total} kg CO2</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {budget.used.toFixed(1)} kg</span>
              <span>Remaining: {(budget.total - budget.used).toFixed(1)} kg</span>
            </div>
            <Progress
              value={(budget.used / budget.total) * 100}
              className="h-4"
              indicatorClassName={budget.used > budget.total ? 'bg-red-500' : 'bg-green-500'}
            />
          </div>

          {budget.used <= budget.total ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-500">
              <IconCheck className="h-5 w-5" />
              <span>You&apos;re {(budget.total - budget.used).toFixed(1)} kg under budget!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
              <IconAlertTriangle className="h-5 w-5" />
              <span>You&apos;re {(budget.used - budget.total).toFixed(1)} kg over budget!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <div className="grid md:grid-cols-3 gap-4">
        {categories.map((category) => {
          const percentage = category.allocated > 0 ? (category.used / category.allocated) * 100 : 0
          const isOverBudget = category.used > category.allocated

          return (
            <Card key={category.name} className="bg-card/50 backdrop-blur border-green-500/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-${category.color}-500/10`}>
                    <category.icon className={`h-5 w-5 text-${category.color}-500`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Budget: {category.allocated.toFixed(0)} kg
                    </p>
                  </div>
                  {isOverBudget && (
                    <IconAlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Used: {category.used.toFixed(1)} kg</span>
                    <span className={isOverBudget ? 'text-red-500' : ''}>
                      {isOverBudget
                        ? `Over by ${(category.used - category.allocated).toFixed(1)} kg`
                        : `${(category.allocated - category.used).toFixed(1)} kg left`
                      }
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percentage, 100)}
                    className="h-2"
                    indicatorClassName={isOverBudget ? 'bg-red-500' : `bg-${category.color}-500`}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(0)}% used
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Budget Tips */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Budget Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {budget.used === 0 ? (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 col-span-2">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <IconTarget className="h-4 w-4 text-blue-500" />
                  Start Tracking
                </h4>
                <p className="text-sm text-muted-foreground">
                  Upload your bills to start tracking your carbon footprint against your budget.
                </p>
              </div>
            ) : budget.used <= budget.total ? (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 col-span-2">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-green-500" />
                  On Track!
                </h4>
                <p className="text-sm text-muted-foreground">
                  Great job! You&apos;re staying within your carbon budget. Keep up the good work
                  and continue making eco-friendly choices.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 col-span-2">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <IconAlertTriangle className="h-4 w-4 text-orange-500" />
                  Over Budget
                </h4>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve exceeded your carbon budget. Consider reducing electricity usage,
                  using public transport, or checking our recommendations for tips.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Set New Budget */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle>Adjust Your Budget</CardTitle>
          <CardDescription>Set your monthly carbon emission target</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Total Monthly Budget (kg CO2)</Label>
            <Input
              type="number"
              placeholder="300"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Average Indian household emits ~150-200 kg CO2/month. A good target is below 200 kg.
            </p>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveBudget}
            disabled={saving}
          >
            {saving ? (
              <>
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Budget"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
