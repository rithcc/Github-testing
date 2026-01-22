"use client"

import { IconLeaf } from "@tabler/icons-react"
import { calculateCarbonScore } from "@/lib/emission-factors"

interface CarbonScoreGaugeProps {
  score: number
}

export function CarbonScoreGauge({ score }: CarbonScoreGaugeProps) {
  const { rating, color } = calculateCarbonScore(1000 - score) // Inverse for display

  // Calculate the stroke dashoffset for the gauge
  const circumference = 2 * Math.PI * 40 // radius = 40
  const progress = (score / 1000) * circumference
  const dashOffset = circumference - progress

  const getScoreColor = () => {
    if (score >= 800) return "#22c55e" // green-500
    if (score >= 600) return "#4ade80" // green-400
    if (score >= 400) return "#facc15" // yellow-400
    if (score >= 200) return "#fb923c" // orange-400
    return "#ef4444" // red-500
  }

  // Show empty state when no data
  if (score === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle only */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
          </svg>
          {/* Empty state text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <IconLeaf className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <span className="text-lg font-medium text-muted-foreground">No data yet</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-sm text-muted-foreground">
            Upload your first bill to see your carbon score
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* SVG Gauge */}
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="score-gauge"
            style={{
              transition: "stroke-dashoffset 1s ease-out"
            }}
          />
        </svg>
        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: getScoreColor() }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ 1000</span>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-4 text-center">
        <div className={`text-lg font-semibold ${color}`}>{rating}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {score >= 600
            ? "Great job! Keep it up!"
            : score >= 400
            ? "You're doing okay, room for improvement"
            : "Let's work on reducing your footprint"}
        </div>
      </div>

      {/* Score Legend */}
      <div className="mt-4 w-full max-w-xs">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>0</span>
          <span>200</span>
          <span>400</span>
          <span>600</span>
          <span>800</span>
          <span>1000</span>
        </div>
        <div className="h-2 rounded-full flex overflow-hidden">
          <div className="flex-1 bg-red-500" />
          <div className="flex-1 bg-orange-400" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-green-400" />
          <div className="flex-1 bg-green-500" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Poor</span>
          <span className="text-center">Average</span>
          <span>Eco Hero</span>
        </div>
      </div>
    </div>
  )
}
