import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Camera,
  Download,
  History,
  ImageUp,
  Keyboard,
  Loader2,
  LocateFixed,
  MapPin,
  Save,
  ScanBarcode,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { CameraScanner, type Decoded } from '@/components/camera-scanner'
import { ImageScanner } from '@/components/image-scanner'
import { useGeolocation } from '@/hooks/use-geolocation'
import { api, type Scan } from '@/lib/api'

export default function App() {
  const [tab, setTab] = useState('scan')
  const [mode, setMode] = useState('camera')
  const [result, setResult] = useState<(Decoded & { source: string }) | null>(null)
  const [barcode, setBarcode] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [scans, setScans] = useState<Scan[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const gps = useGeolocation()

  const load = useCallback(async () => {
    setLoadingList(true)
    try {
      setScans(await api.list())
    } catch (e) {
      toast.error('Gagal memuat riwayat: ' + (e as Error).message)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onDetect = (d: Decoded, source: string) => {
    setResult({ ...d, source })
    setBarcode(d.text)
    gps.refresh()
    toast.success('Barcode terdeteksi')
  }

  const reset = () => {
    setResult(null)
    setBarcode('')
    setNote('')
  }

  const submit = async () => {
    if (!result) return
    setSaving(true)
    try {
      await api.create({
        barcode,
        format: result.format,
        latitude: gps.pos?.latitude ?? null,
        longitude: gps.pos?.longitude ?? null,
        accuracy: gps.pos?.accuracy ?? null,
        note: note || null,
        source: result.source,
      })
      toast.success('Tersimpan ke database')
      reset()
      load()
    } catch (e) {
      toast.error('Gagal menyimpan: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Hapus data ini?')) return
    await api.remove(id)
    setScans((s) => s.filter((x) => x.id !== id))
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <Toaster />
      <header className="flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl">
          <ScanBarcode className="size-5" />
        </div>
        <h1 className="text-lg font-semibold">GeoScan Barcode</h1>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <TabsContent value="scan" className="space-y-4">
            <GpsCard {...gps} />

            {!result ? (
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList>
                  <TabsTrigger value="camera">
                    <Camera /> Kamera
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <ImageUp /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    <Keyboard /> Manual
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="camera">
                  {mode === 'camera' && <CameraScanner onDetect={(d) => onDetect(d, 'camera')} />}
                </TabsContent>
                <TabsContent value="manual">
                  <Card>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground text-sm">
                        Ketik serial number secara manual tanpa scan. Lokasi GPS tetap dicatat otomatis.
                      </p>
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          setResult({ text: '', format: 'MANUAL', source: 'manual' })
                          setBarcode('')
                          gps.refresh()
                        }}
                      >
                        <Keyboard /> Input Manual
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="upload">
                  <ImageScanner onDetect={(d) => onDetect(d, 'upload')} />
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Hasil Scan
                    {result.format !== 'MANUAL' && <Badge>{result.format}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Serial Number</Label>
                    <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="font-mono"
                      autoFocus={result.source === 'manual'}
                      autoCapitalize="characters"
                      autoComplete="off"
                      placeholder="Scan atau ketik serial number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note">Catatan (opsional)</Label>
                    <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. lokasi gudang A" />
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <MapPin className="size-4" />
                    {gps.pos
                      ? `${gps.pos.latitude.toFixed(6)}, ${gps.pos.longitude.toFixed(6)}`
                      : 'Koordinat belum tersedia (data tetap dapat disimpan)'}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Button size="lg" onClick={submit} disabled={saving || !barcode.trim()}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save />} Simpan
                    </Button>
                    <Button size="lg" variant="outline" onClick={reset} aria-label="Batal">
                      <X />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">{scans.length} data tersimpan</p>
              <Button size="sm" asChild disabled={!scans.length}>
                <a href={api.exportUrl} download>
                  <Download /> Export CSV
                </a>
              </Button>
            </div>
            {loadingList && <Loader2 className="text-muted-foreground mx-auto animate-spin" />}
            {!loadingList && !scans.length && (
              <p className="text-muted-foreground py-12 text-center text-sm">Belum ada data. Mulai scan barcode.</p>
            )}
            {scans.map((s) => (
              <Card key={s.id} className="gap-2 py-4">
                <CardContent className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm font-semibold break-all">{s.barcode}</p>
                    <Button variant="ghost" size="icon" className="-mt-2 -mr-2 size-8 shrink-0" onClick={() => remove(s.id)} aria-label="Hapus">
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                  </div>
                  {s.latitude !== null && s.longitude !== null ? (
                    <a
                      className="text-primary flex items-center gap-1 text-sm underline-offset-2 hover:underline"
                      href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="size-3.5" /> {s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm">Tanpa koordinat</p>
                  )}
                  {s.note && <p className="text-sm">{s.note}</p>}
                  <p className="text-muted-foreground text-xs">{s.scanned_at} UTC</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </main>

        <nav className="border-t bg-card px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <TabsList className="h-14">
            <TabsTrigger value="scan" className="flex-col gap-0.5 text-xs">
              <ScanBarcode /> Scan
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-col gap-0.5 text-xs"
              onClick={() => load()}
            >
              <History /> Riwayat
            </TabsTrigger>
          </TabsList>
        </nav>
      </Tabs>
    </div>
  )
}

function GpsCard({ pos, error, loading, refresh }: ReturnType<typeof useGeolocation>) {
  return (
    <Card className="gap-0 py-3">
      <CardContent className="flex items-center gap-3">
        <div className={`grid size-9 shrink-0 place-items-center rounded-full ${pos ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          {pos ? (
            <>
              <p className="font-mono font-medium">
                {pos.latitude.toFixed(6)}, {pos.longitude.toFixed(6)}
              </p>
              <p className="text-muted-foreground text-xs">Akurasi ±{Math.round(pos.accuracy)} m</p>
            </>
          ) : (
            <p className={error ? 'text-destructive' : 'text-muted-foreground'}>{error ?? 'Mencari sinyal GPS…'}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          Segarkan
        </Button>
      </CardContent>
    </Card>
  )
}
