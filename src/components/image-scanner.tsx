import { useRef, useState } from 'react'
import { ImageUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatName, makeReader, type Decoded } from '@/components/camera-scanner'

export function ImageScanner({ onDetect }: { onDetect: (d: Decoded) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = async (file?: File) => {
    if (!file) return
    setError(null)
    setBusy(true)
    const url = URL.createObjectURL(file)
    setPreview(url)
    try {
      const result = await makeReader().decodeFromImageUrl(url)
      onDetect({ text: result.getText(), format: formatName(result.getBarcodeFormat()) })
    } catch {
      setError('Barcode tidak terdeteksi. Coba foto yang lebih jelas dan terang.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="bg-muted grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border border-dashed">
        {preview ? (
          <img src={preview} alt="Preview barcode" className="size-full object-contain" />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
            <ImageUp className="size-12" />
            Pilih gambar barcode
          </div>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      <Button size="lg" className="w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <ImageUp />} {busy ? 'Membaca…' : 'Upload Gambar Barcode'}
      </Button>
    </div>
  )
}
