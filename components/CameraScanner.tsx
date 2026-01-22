"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  IconCamera,
  IconCameraRotate,
  IconX,
  IconCapture,
  IconLoader2
} from "@tabler/icons-react"

interface CameraScannerProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [captured, setCaptured] = useState(false)

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsLoading(false)
        }
      }
    } catch (err) {
      console.error("Camera error:", err)
      setError("Could not access camera. Please ensure you have granted camera permissions.")
      setIsLoading(false)
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (!isLoading && !captured) {
      startCamera()
    }
  }, [facingMode])

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user")
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Show the captured image
    setCaptured(true)

    // Stop the video stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const retake = () => {
    setCaptured(false)
    startCamera()
  }

  const confirmCapture = () => {
    if (!canvasRef.current) return

    // Convert canvas to blob/file
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" })
        onCapture(file)
      }
    }, "image/jpeg", 0.9)
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    onClose()
  }

  return (
    <Card className="bg-card/95 backdrop-blur border-green-500/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconCamera className="h-5 w-5 text-green-500" />
            Scan Bill
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <IconX className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="p-6 text-center">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
              {error}
            </div>
            <Button variant="outline" onClick={handleClose}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Video preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full aspect-[4/3] object-cover bg-black ${captured ? "hidden" : ""}`}
            />

            {/* Canvas for captured image */}
            <canvas
              ref={canvasRef}
              className={`w-full aspect-[4/3] object-cover ${captured ? "" : "hidden"}`}
            />

            {/* Loading overlay */}
            {isLoading && !captured && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <IconLoader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-2" />
                  <p className="text-white text-sm">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Scan guide overlay */}
            {!isLoading && !captured && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-green-500/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg -translate-x-0.5 -translate-y-0.5" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg translate-x-0.5 -translate-y-0.5" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg -translate-x-0.5 translate-y-0.5" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg translate-x-0.5 translate-y-0.5" />
                </div>
                <p className="absolute bottom-16 left-0 right-0 text-center text-white text-sm bg-black/50 py-2">
                  Position your bill within the frame
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="p-4 bg-black/80">
              {captured ? (
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={retake} className="flex-1 max-w-32">
                    <IconCameraRotate className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={confirmCapture} className="flex-1 max-w-32 bg-green-600 hover:bg-green-700">
                    <IconCapture className="h-4 w-4 mr-2" />
                    Use Photo
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 justify-center items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={switchCamera}
                    disabled={isLoading}
                    className="rounded-full"
                  >
                    <IconCameraRotate className="h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    onClick={capturePhoto}
                    disabled={isLoading}
                    className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                  >
                    <IconCapture className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClose}
                    className="rounded-full"
                  >
                    <IconX className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
