"use client"

import { getImpactVisualization } from "@/lib/emission-factors"
import { IconTree, IconCar, IconBulb, IconBalloon, IconDeviceMobile } from "@tabler/icons-react"

interface ImpactVisualizationProps {
  carbonKg: number
}

export function ImpactVisualization({ carbonKg }: ImpactVisualizationProps) {
  const impact = getImpactVisualization(carbonKg)

  const impactItems = [
    {
      icon: IconTree,
      value: impact.trees.toFixed(1),
      label: "Trees needed to absorb",
      unit: "trees/year",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      icon: IconCar,
      value: impact.drivingKm.toLocaleString(),
      label: "Equivalent driving",
      unit: "km",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: IconBulb,
      value: impact.lightbulbHours.toLocaleString(),
      label: "60W bulb running",
      unit: "hours",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      icon: IconDeviceMobile,
      value: impact.smartphoneCharges.toLocaleString(),
      label: "Smartphone charges",
      unit: "charges",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {impactItems.map((item, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg ${item.bgColor} border border-${item.color.replace('text-', '')}/20`}
        >
          <div className="flex items-center gap-2 mb-1">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {item.label}
          </div>
          <div className="text-xs text-muted-foreground/70">
            {item.unit}
          </div>
        </div>
      ))}
    </div>
  )
}
