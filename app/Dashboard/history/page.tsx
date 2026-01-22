"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  IconBolt,
  IconGasStation,
  IconDroplet,
  IconLeaf,
  IconCalendar,
  IconDownload,
  IconFilter,
  IconLoader2,
  IconTrash
} from "@tabler/icons-react"
import { api } from "@/lib/api"

interface Bill {
  id: string
  date: string
  type: string
  units: number | null
  unitType: string | null
  carbonEmission: number
  amount: number
}

const getIconForType = (type: string) => {
  switch (type.toLowerCase()) {
    case "electricity":
      return { icon: IconBolt, color: "yellow" }
    case "petrol":
    case "diesel":
      return { icon: IconGasStation, color: "blue" }
    case "lpg":
    case "gas":
      return { icon: IconGasStation, color: "orange" }
    case "water":
      return { icon: IconDroplet, color: "cyan" }
    default:
      return { icon: IconLeaf, color: "green" }
  }
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState<Bill[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchBills()
  }, [])

  async function fetchBills() {
    try {
      const { data } = await api.getBills({ limit: 50 })
      if (data?.bills) {
        setBills(data.bills)
      }
    } catch (error) {
      console.error("Failed to fetch bills:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this bill?")) return

    setDeleting(id)
    try {
      const { error } = await api.deleteBill(id)
      if (!error) {
        setBills(bills.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete bill:", error)
    } finally {
      setDeleting(null)
    }
  }

  const totalCarbon = bills.reduce((sum, item) => sum + item.carbonEmission, 0)

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
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">Your carbon footprint records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <IconFilter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <IconDownload className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{bills.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Total Carbon</div>
            <div className="text-2xl font-bold text-green-500">
              {totalCarbon.toFixed(1)} kg
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Bills Tracked</div>
            <div className="text-2xl font-bold">{bills.length} entries</div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card className="bg-card/50 backdrop-blur border-green-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="h-5 w-5" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IconLeaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bills uploaded yet.</p>
              <p className="text-sm">Upload your first bill to start tracking!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((item) => {
                const { icon: Icon, color } = getIconForType(item.type)
                const formattedDate = new Date(item.date).toLocaleDateString()

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                        <Icon className={`h-5 w-5 text-${color}-500`} />
                      </div>
                      <div>
                        <div className="font-medium capitalize">{item.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {formattedDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">
                          {item.units} {item.unitType}
                        </div>
                        <div className="text-sm text-green-500 flex items-center justify-end gap-1">
                          <IconLeaf className="h-3 w-3" />
                          {item.carbonEmission.toFixed(1)} kg CO2
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        {deleting === item.id ? (
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <IconTrash className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
