"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  IconUpload,
  IconFile,
  IconCheck,
  IconX,
  IconBolt,
  IconGasStation,
  IconShoppingCart,
  IconLeaf,
  IconLoader2,
  IconCamera,
  IconUser
} from "@tabler/icons-react"
import { CameraScanner } from "@/components/CameraScanner"
import { calculateCarbonFromBill } from "@/lib/emission-factors"
import { api } from "@/lib/api"

interface UserDetails {
  name?: string | null
  phone?: string | null
  consumerId?: string | null
  address?: string | null
}

interface ExtractedData {
  billType: string
  amount: number
  unit: string
  provider?: string
  date?: string
  carbonFootprint: number
  billId?: string
  entryMethod: 'scanner' | 'manual'
  userDetails?: UserDetails
}

export function BillUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [formData, setFormData] = useState({
    billType: "electricity",
    amount: "",
    unit: "kWh",
    totalRupees: ""
  })
  const [showScanner, setShowScanner] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      processImage(selectedFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  })

  // Parse extracted text to find bill data
  const parseBillText = (text: string): { billType: string; amount: number | null; unit: string; provider?: string; totalAmount?: number } => {
    const lowerText = text.toLowerCase()
    let billType = "electricity"
    let amount: number | null = null
    let unit = "kWh"
    let provider: string | undefined
    let totalAmount: number | undefined

    console.log("Parsing bill text:", text) // Debug log

    // Detect bill type
    if (lowerText.includes("petrol") || lowerText.includes("fuel") || lowerText.includes("hp") || lowerText.includes("bharat petroleum") || lowerText.includes("indian oil") || lowerText.includes("iocl") || lowerText.includes("bpcl")) {
      billType = "petrol"
      unit = "L"
    } else if (lowerText.includes("diesel")) {
      billType = "diesel"
      unit = "L"
    } else if (lowerText.includes("lpg") || lowerText.includes("gas cylinder") || lowerText.includes("indane") || lowerText.includes("bharat gas") || lowerText.includes("hp gas")) {
      billType = "lpg"
      unit = "kg"
    } else if (lowerText.includes("electricity") || lowerText.includes("kwh") || lowerText.includes("units consumed") || lowerText.includes("power") || lowerText.includes("discom") || lowerText.includes("electricity board") || lowerText.includes("eb bill") || lowerText.includes("tneb") || lowerText.includes("bescom") || lowerText.includes("msedcl")) {
      billType = "electricity"
      unit = "kWh"
    }

    // First, try to extract total amount (in Rupees) - this is the most common thing on bills
    const amountPatterns = [
      /(?:total|amount|net|payable|due|grand\s*total|bill\s*amount)[:\s]*(?:rs\.?|₹|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:rs\.?|₹|inr)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rs\.?|₹|inr)/i,
      /(?:amount|total)[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ]

    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        totalAmount = parseFloat(match[1].replace(/,/g, ''))
        console.log("Found total amount:", totalAmount)
        break
      }
    }

    // Extract units based on bill type
    if (billType === "electricity") {
      // Look for kWh patterns
      const kwhPatterns = [
        /(\d+(?:\.\d+)?)\s*kwh/i,
        /(\d+(?:\.\d+)?)\s*kw\s*h/i,
        /units?\s*consumed[:\s]*(\d+(?:\.\d+)?)/i,
        /units?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
        /consumption\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
        /total\s*units?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*units/i,
        /energy\s*consumed[:\s]*(\d+(?:\.\d+)?)/i,
        /meter\s*reading[:\s]*\d+[:\s]*(\d+)/i,
      ]
      for (const pattern of kwhPatterns) {
        const match = text.match(pattern)
        if (match) {
          const val = parseFloat(match[1])
          // Electricity units are typically between 10-2000 kWh for residential
          if (val > 0 && val < 10000) {
            amount = val
            console.log("Found electricity units:", amount)
            break
          }
        }
      }

      // Fallback: estimate from total amount (avg Rs 7-8 per unit in India)
      if (amount === null && totalAmount && totalAmount > 50) {
        amount = Math.round(totalAmount / 7.5)
        console.log("Estimated units from amount:", amount)
      }
    } else if (billType === "petrol" || billType === "diesel") {
      // Look for liter patterns
      const literPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:l|ltr|liters?|litres?)/i,
        /qty[:\s]*(\d+(?:\.\d+)?)/i,
        /quantity[:\s]*(\d+(?:\.\d+)?)/i,
        /volume[:\s]*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:l|ltr)/i,
      ]
      for (const pattern of literPatterns) {
        const match = text.match(pattern)
        if (match) {
          const val = parseFloat(match[1])
          // Fuel quantity typically 1-100 liters
          if (val > 0 && val < 200) {
            amount = val
            console.log("Found fuel liters:", amount)
            break
          }
        }
      }

      // Fallback: estimate from total amount (avg Rs 100 per liter)
      if (amount === null && totalAmount && totalAmount > 50) {
        const pricePerLiter = billType === "petrol" ? 105 : 92 // Approximate prices
        amount = Math.round((totalAmount / pricePerLiter) * 10) / 10
        console.log("Estimated liters from amount:", amount)
      }
    } else if (billType === "lpg") {
      // Look for kg or cylinder patterns
      const gasPatterns = [
        /(\d+(?:\.\d+)?)\s*kg/i,
        /(\d+)\s*cylinder/i,
        /14\.2\s*kg/i, // Standard cylinder size
      ]
      for (const pattern of gasPatterns) {
        const match = text.match(pattern)
        if (match) {
          amount = parseFloat(match[1])
          // If it's cylinders, convert to kg (1 cylinder ≈ 14.2 kg)
          if (lowerText.includes("cylinder") && amount < 10) {
            amount = amount * 14.2
          }
          console.log("Found LPG amount:", amount)
          break
        }
      }
      // Default for LPG cylinder if not found
      if (amount === null && (lowerText.includes("cylinder") || lowerText.includes("lpg") || lowerText.includes("indane"))) {
        amount = 14.2 // Single cylinder default
        console.log("Using default LPG cylinder:", amount)
      }
    }

    // Try to extract provider name
    const providerPatterns = [
      /(bescom|cesc|tata power|adani|reliance|torrent|bses|ndpl|brpl|tneb|msedcl|uppcl|wbsedcl)/i,
      /(indian oil|iocl|hp|hpcl|bharat petroleum|bpcl|essar|reliance petrol|shell)/i,
      /(indane|bharat gas|hp gas)/i,
    ]
    for (const pattern of providerPatterns) {
      const match = text.match(pattern)
      if (match) {
        provider = match[1].toUpperCase()
        break
      }
    }

    console.log("Parsed result:", { billType, amount, unit, provider, totalAmount })
    return { billType, amount, unit, provider, totalAmount }
  }

  const processImage = async (file: File) => {
    setProcessing(true)
    setProgress(0)
    setError(null)
    setManualEntry(false)

    try {
      setProgress(20)

      // Use OpenAI Vision API for bill extraction
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)

      setProgress(40)

      const response = await fetch('/api/bills/extract', {
        method: 'POST',
        body: formDataToSend,
      })

      setProgress(70)

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.log("OpenAI extraction failed:", result.error)
        // Fall back to manual entry
        setError(result.error || "Could not extract bill data. Please enter the amount manually.")
        setManualEntry(true)
        setProcessing(false)
        setProgress(0)
        return
      }

      setProgress(90)

      const data = result.data
      console.log("OpenAI extracted:", data)

      // Calculate carbon footprint
      const carbon = calculateCarbonFromBill(data.billType, data.units, data.unitType, "india")

      console.log("Successfully extracted:", { type: data.billType, units: data.units, carbon })

      // Update bill date if extracted
      if (data.date) {
        setBillDate(data.date)
      }

      setExtractedData({
        billType: data.billType,
        amount: data.units,
        unit: data.unitType,
        provider: data.provider,
        date: data.date || new Date().toLocaleDateString(),
        carbonFootprint: carbon,
        entryMethod: 'scanner',
        userDetails: data.userDetails
      })
      setProgress(100)
    } catch (err) {
      console.error("Error processing image:", err)
      setError("Failed to process image. Please enter the amount manually.")
      setManualEntry(true)
    } finally {
      setProcessing(false)
    }
  }

  // Price per unit estimates for India (2024)
  const pricePerUnit: Record<string, { rate: number; unit: string }> = {
    electricity: { rate: 7.5, unit: "kWh" },
    petrol: { rate: 105, unit: "L" },
    diesel: { rate: 92, unit: "L" },
    lpg: { rate: 63.4, unit: "kg" }, // ~900 per 14.2kg cylinder
  }

  const handleManualSubmit = () => {
    const totalRupees = parseFloat(formData.totalRupees)
    if (isNaN(totalRupees) || totalRupees <= 0) {
      setError("Please enter the bill amount in rupees")
      return
    }

    // Calculate units from total amount
    const priceInfo = pricePerUnit[formData.billType] || { rate: 10, unit: "units" }
    const calculatedUnits = Math.round((totalRupees / priceInfo.rate) * 10) / 10

    const carbon = calculateCarbonFromBill(formData.billType, calculatedUnits, priceInfo.unit, "india")

    // Clear any previous error
    setError(null)

    setExtractedData({
      billType: formData.billType,
      amount: calculatedUnits,
      unit: priceInfo.unit,
      carbonFootprint: carbon,
      entryMethod: file ? 'scanner' : 'manual'
    })
  }

  // Auto-save when data is extracted from OCR (scanner method)
  useEffect(() => {
    const autoSaveBill = async () => {
      if (extractedData && extractedData.entryMethod === 'scanner' && !saved && !saving) {
        setSaving(true)
        setError(null)

        try {
          const { data, error: apiError } = await api.createBill({
            type: extractedData.billType,
            amount: 0,
            units: extractedData.amount,
            date: billDate,
            entryMethod: extractedData.entryMethod,
            userDetails: extractedData.userDetails,
          })

          if (apiError) {
            setError(apiError)
            setSaving(false)
            return
          }

          setSaved(true)
          if (data?.bill) {
            setExtractedData(prev => prev ? { ...prev, billId: data.bill.id } : null)
          }
        } catch {
          setError("Failed to save bill. Please try again.")
        } finally {
          setSaving(false)
        }
      }
    }

    autoSaveBill()
  }, [extractedData])

  const getBillTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "electricity":
        return <IconBolt className="h-5 w-5 text-yellow-500" />
      case "fuel":
      case "petrol":
      case "diesel":
        return <IconGasStation className="h-5 w-5 text-blue-500" />
      case "shopping":
        return <IconShoppingCart className="h-5 w-5 text-purple-500" />
      default:
        return <IconLeaf className="h-5 w-5 text-green-500" />
    }
  }

  const resetUpload = () => {
    setFile(null)
    setPreview(null)
    setExtractedData(null)
    setProgress(0)
    setSaved(false)
    setError(null)
    setShowScanner(false)
  }

  const handleCameraCapture = (capturedFile: File) => {
    setShowScanner(false)
    setFile(capturedFile)
    setPreview(URL.createObjectURL(capturedFile))
    processImage(capturedFile)
  }

  const saveToDashboard = async () => {
    if (!extractedData) return

    setSaving(true)
    setError(null)

    try {
      const { data, error: apiError } = await api.createBill({
        type: extractedData.billType,
        amount: 0, // Amount in rupees not tracked separately
        units: extractedData.amount,
        date: billDate,
        entryMethod: extractedData.entryMethod,
        userDetails: extractedData.userDetails,
      })

      if (apiError) {
        setError(apiError)
        return
      }

      setSaved(true)
      // Update extracted data with the bill ID
      if (data?.bill) {
        setExtractedData(prev => prev ? { ...prev, billId: data.bill.id } : null)
      }
    } catch {
      setError("Failed to save bill. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Camera Scanner */}
      {showScanner && (
        <CameraScanner
          onCapture={handleCameraCapture}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Upload Area */}
      {!file && !manualEntry && !showScanner && (
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle>Upload Your Bill</CardTitle>
            <CardDescription>
              Scan or upload an electricity, fuel, or shopping bill for automatic carbon calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Scan Button - Primary Action */}
            <Button
              onClick={() => setShowScanner(true)}
              className="w-full mb-4 h-14 text-lg bg-green-600 hover:bg-green-700"
            >
              <IconCamera className="h-6 w-6 mr-2" />
              Scan Bill
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or upload file</span>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border hover:border-green-500/50 hover:bg-green-500/5'
                }`}
            >
              <input {...getInputProps()} />
              <IconUpload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-green-500">Drop your bill here...</p>
              ) : (
                <>
                  <p className="text-lg mb-2">Drag & drop your bill here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports: JPG, PNG, PDF
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground">or</span>
              <Button
                variant="ghost"
                className="ml-2"
                onClick={() => setManualEntry(true)}
              >
                Enter Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Entry Form - shown after upload or for manual entry */}
      {manualEntry && !extractedData && !showScanner && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Preview (if uploaded) */}
          {file && preview && (
            <Card className="bg-card/50 backdrop-blur border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconFile className="h-5 w-5" />
                  Uploaded Bill
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={preview}
                  alt="Bill preview"
                  className="w-full rounded-lg border border-border"
                />
              </CardContent>
            </Card>
          )}

          {/* Entry Form */}
          <Card className="bg-card/50 backdrop-blur border-green-500/20">
            <CardHeader>
              <CardTitle>Enter Bill Details</CardTitle>
              <CardDescription>
                {file ? "Enter the total amount from your bill" : "Enter your bill details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bill Type</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={formData.billType}
                  onChange={(e) => setFormData(prev => ({ ...prev, billType: e.target.value }))}
                >
                  <option value="electricity">Electricity Bill</option>
                  <option value="petrol">Petrol/Fuel</option>
                  <option value="diesel">Diesel</option>
                  <option value="lpg">LPG/Gas Cylinder</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Total Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    placeholder="Enter bill amount"
                    className="pl-8"
                    value={formData.totalRupees}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalRupees: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll calculate the carbon footprint from this amount
                </p>
              </div>

              <div className="space-y-2">
                <Label>Bill Date</Label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="bg-muted/50"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleManualSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
                  <IconLeaf className="h-4 w-4 mr-2" />
                  Calculate Carbon
                </Button>
                <Button variant="outline" onClick={() => {
                  setManualEntry(false)
                  setError(null)
                  if (file) {
                    setFile(null)
                    setPreview(null)
                  }
                }}>
                  {file ? "Cancel" : "Back"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processing State */}
      {processing && (
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <IconLoader2 className="h-12 w-12 mx-auto text-green-500 animate-spin" />
              <div>
                <p className="font-medium">Processing your bill...</p>
                <p className="text-sm text-muted-foreground">Extracting data with AI</p>
              </div>
              <Progress value={progress} className="max-w-xs mx-auto" indicatorClassName="bg-green-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview & Results */}
      {file && !processing && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Preview */}
          <Card className="bg-card/50 backdrop-blur border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFile className="h-5 w-5" />
                Uploaded Bill
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preview && (
                <img
                  src={preview}
                  alt="Bill preview"
                  className="w-full rounded-lg border border-border"
                />
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={resetUpload}
              >
                <IconX className="h-4 w-4 mr-2" />
                Upload Different Bill
              </Button>
            </CardContent>
          </Card>

          {/* Extracted Data */}
          {extractedData && (
            <Card className="bg-card/50 backdrop-blur border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconCheck className="h-5 w-5 text-green-500" />
                  Extracted Data
                </CardTitle>
                <CardDescription>AI detected the following information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {getBillTypeIcon(extractedData.billType)}
                  <div>
                    <div className="text-sm text-muted-foreground">Bill Type</div>
                    <div className="font-medium capitalize">{extractedData.billType}</div>
                  </div>
                </div>

                {extractedData.provider && (
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{extractedData.provider}</span>
                  </div>
                )}

                {/* User Details Section */}
                {extractedData.userDetails && (extractedData.userDetails.name || extractedData.userDetails.phone || extractedData.userDetails.consumerId || extractedData.userDetails.address) && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3">
                      <IconUser className="h-4 w-4" />
                      Customer Details
                    </div>
                    <div className="space-y-2">
                      {extractedData.userDetails.name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Name</span>
                          <span className="font-medium text-sm">{extractedData.userDetails.name}</span>
                        </div>
                      )}
                      {extractedData.userDetails.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Phone</span>
                          <span className="font-medium text-sm">{extractedData.userDetails.phone}</span>
                        </div>
                      )}
                      {extractedData.userDetails.consumerId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Consumer ID</span>
                          <span className="font-medium text-sm">{extractedData.userDetails.consumerId}</span>
                        </div>
                      )}
                      {extractedData.userDetails.address && (
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm">Address</span>
                          <span className="font-medium text-sm">{extractedData.userDetails.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Consumption</span>
                  <span className="font-medium">
                    {extractedData.amount} {extractedData.unit}
                  </span>
                </div>

                {extractedData.date && (
                  <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{extractedData.date}</span>
                  </div>
                )}

                {/* Carbon Result */}
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Carbon Footprint</div>
                      <div className="text-2xl font-bold text-green-500">
                        {extractedData.carbonFootprint.toFixed(1)} kg CO2
                      </div>
                    </div>
                    <IconLeaf className="h-10 w-10 text-green-500" />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Bill Date</Label>
                  <Input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="bg-muted/50"
                  />
                </div>

                {extractedData.entryMethod === 'scanner' ? (
                  // Auto-save status for scanned bills
                  <div className="space-y-3">
                    <div className={`w-full p-3 rounded-lg text-center ${saved ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                          Auto-saving & calculating score...
                        </span>
                      ) : saved ? (
                        <span className="flex items-center justify-center gap-2">
                          <IconCheck className="h-4 w-4" />
                          Saved! Carbon score updated.
                        </span>
                      ) : null}
                    </div>
                    {saved && (
                      <div className="flex gap-2">
                        <Link href="/Dashboard/score" className="flex-1">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <IconLeaf className="h-4 w-4 mr-2" />
                            View Carbon Score
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={resetUpload}>
                          Upload Another
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Manual save button for manually entered bills
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={saveToDashboard}
                    disabled={saving || saved}
                  >
                    {saving ? (
                      <>
                        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <IconCheck className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <IconCheck className="h-4 w-4 mr-2" />
                        Save to Dashboard
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results without file (manual entry) */}
      {!file && extractedData && (
        <Card className="bg-card/50 backdrop-blur border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCheck className="h-5 w-5 text-green-500" />
              Carbon Calculation Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {getBillTypeIcon(extractedData.billType)}
              <div>
                <div className="text-sm text-muted-foreground">Bill Type</div>
                <div className="font-medium capitalize">{extractedData.billType}</div>
              </div>
            </div>

            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Consumption</span>
              <span className="font-medium">
                {extractedData.amount} {extractedData.unit}
              </span>
            </div>

            {/* User Details Section for manual entry */}
            {extractedData.userDetails && (extractedData.userDetails.name || extractedData.userDetails.phone || extractedData.userDetails.consumerId || extractedData.userDetails.address) && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3">
                  <IconUser className="h-4 w-4" />
                  Customer Details
                </div>
                <div className="space-y-2">
                  {extractedData.userDetails.name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Name</span>
                      <span className="font-medium text-sm">{extractedData.userDetails.name}</span>
                    </div>
                  )}
                  {extractedData.userDetails.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Phone</span>
                      <span className="font-medium text-sm">{extractedData.userDetails.phone}</span>
                    </div>
                  )}
                  {extractedData.userDetails.consumerId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Consumer ID</span>
                      <span className="font-medium text-sm">{extractedData.userDetails.consumerId}</span>
                    </div>
                  )}
                  {extractedData.userDetails.address && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-sm">Address</span>
                      <span className="font-medium text-sm">{extractedData.userDetails.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Carbon Footprint</div>
                  <div className="text-2xl font-bold text-green-500">
                    {extractedData.carbonFootprint.toFixed(1)} kg CO2
                  </div>
                </div>
                <IconLeaf className="h-10 w-10 text-green-500" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Bill Date</Label>
              <Input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="bg-muted/50"
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={saveToDashboard}
                disabled={saving || saved}
              >
                {saving ? (
                  <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <IconCheck className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <IconCheck className="h-4 w-4 mr-2" />
                    Save to Dashboard
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => {
                setExtractedData(null)
                setManualEntry(false)
                setSaved(false)
                setError(null)
              }}>
                Add Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
