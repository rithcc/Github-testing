"use client"

import { IconBolt, IconCar, IconMeat, IconShoppingBag, IconLeaf } from "@tabler/icons-react"

interface BreakdownData {
  electricity: number
  transport: number
  food: number
  shopping: number
}

interface CarbonBreakdownChartProps {
  data: BreakdownData
  total: number
}

export function CarbonBreakdownChart({ data, total }: CarbonBreakdownChartProps) {
  const categories = [
    {
      name: "Electricity",
      value: data.electricity,
      color: "bg-yellow-500",
      textColor: "text-yellow-500",
      icon: IconBolt
    },
    {
      name: "Transport",
      value: data.transport,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      icon: IconCar
    },
    {
      name: "Food",
      value: data.food,
      color: "bg-orange-500",
      textColor: "text-orange-500",
      icon: IconMeat
    },
    {
      name: "Shopping",
      value: data.shopping,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      icon: IconShoppingBag
    },
  ]

  // Check if all values are 0
  const hasData = total > 0

  // Show empty state if no data
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <IconLeaf className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center">No carbon data yet</p>
        <p className="text-sm text-center">Upload bills to see your breakdown</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const percentage = total > 0 ? (category.value / total) * 100 : 0
        const displayPercentage = percentage.toFixed(0)

        return (
          <div key={category.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <category.icon className={`h-4 w-4 ${category.value > 0 ? category.textColor : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${category.value === 0 ? 'text-muted-foreground' : ''}`}>
                  {category.name}
                </span>
              </div>
              <div className="text-sm">
                <span className={`font-medium ${category.value === 0 ? 'text-muted-foreground' : ''}`}>
                  {category.value.toFixed(1)} kg
                </span>
                <span className="text-muted-foreground ml-2">({displayPercentage}%)</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              {category.value > 0 && (
                <div
                  className={`h-full ${category.color} transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, 1)}%` }}
                />
              )}
            </div>
          </div>
        )
      })}

      {/* Total */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <span className="font-bold text-lg">{total.toFixed(1)} kg CO2</span>
        </div>
      </div>

      {/* Visual Pie Chart - only show if there's data */}
      <div className="flex justify-center pt-4">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {categories.reduce((acc, category, index) => {
              // Skip categories with 0 value
              if (category.value <= 0) return acc

              const percentage = (category.value / total) * 100
              const prevPercentage = categories
                .slice(0, index)
                .filter(c => c.value > 0)
                .reduce((sum, c) => sum + (c.value / total) * 100, 0)

              const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`
              const strokeDashoffset = -prevPercentage * 2.51

              acc.push(
                <circle
                  key={category.name}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  strokeWidth="20"
                  className={category.color.replace('bg-', 'stroke-')}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  style={{ stroke: getCSSColor(category.color) }}
                />
              )
              return acc
            }, [] as JSX.Element[])}
          </svg>
        </div>
      </div>
    </div>
  )
}

function getCSSColor(bgClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-yellow-500': '#eab308',
    'bg-blue-500': '#3b82f6',
    'bg-orange-500': '#f97316',
    'bg-purple-500': '#a855f7',
  }
  return colorMap[bgClass] || '#22c55e'
}
