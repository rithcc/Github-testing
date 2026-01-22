"use client"

import { BillUploader } from "@/components/BillUploader"

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Bill</h1>
        <p className="text-muted-foreground">
          Upload your bills to automatically calculate carbon footprint
        </p>
      </div>

      <BillUploader />

      {/* Supported Bills Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <h3 className="font-medium mb-2">Electricity Bills</h3>
          <p className="text-sm text-muted-foreground">
            Upload your electricity bill to calculate CO2 from power consumption.
            Factor: 0.82 kg CO2/kWh (India)
          </p>
        </div>
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h3 className="font-medium mb-2">Fuel Receipts</h3>
          <p className="text-sm text-muted-foreground">
            Upload petrol/diesel receipts.
            Petrol: 2.31 kg CO2/L, Diesel: 2.68 kg CO2/L
          </p>
        </div>
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <h3 className="font-medium mb-2">Gas/LPG Bills</h3>
          <p className="text-sm text-muted-foreground">
            Upload your cooking gas bills.
            LPG: 1.51 kg CO2/L
          </p>
        </div>
      </div>
    </div>
  )
}
