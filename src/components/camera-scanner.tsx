import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Decoded = { text: string; format: string }

const hints = new Map()
hints.set(DecodeHintType.TRY_HARDER, true)

export function makeReader() {
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 })
}

export const formatName = (f: BarcodeFormat) => BarcodeFormat[f]

export function CameraScanner({ onDetect }: { onDetect: (d: Decoded) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controls = useRef<IScannerControls | null>(null)
  const onDetectRef = useRef(onDetect)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDetectRef.current = onDetect
  })

  const stop = () => {
    controls.current?.stop()
    controls.current = null
    setActive(false)
  }

  const start = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Kamera butuh HTTPS atau localhost.')
      return
    }
    try {
      setActive(true)
      controls.current = await makeReader().decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (result) => {
          if (result) {
            if (navigator.vibrate) navigator.vibrate(80)
            onDetectRef.current({ text: result.getText(), format: formatName(result.getBarcodeFormat()) })
            stop()
          }
        },
      )
    } catch {
      setActive(false)
      setError('Tidak bisa mengakses kamera. Periksa izin kamera.')
    }
  }

  useEffect(() => () => controls.current?.stop(), [])

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        {active ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-1/2 w-4/5 rounded-lg border-2 border-white/80">
              <div className="absolute inset-x-0 top-1/2 h-0.5 animate-pulse bg-red-500" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <CameraOff className="size-12" />
          </div>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {active ? (
        <Button variant="outline" size="lg" className="w-full" onClick={stop}>
          <CameraOff /> Matikan Kamera
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={start}>
          <Camera /> Mulai Scan Kamera
        </Button>
      )}
    </div>
  )
}
