export type Scan = {
  id: number
  barcode: string
  format: string | null
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  note: string | null
  source: string | null
  scanned_at: string
}

export type NewScan = Omit<Scan, 'id' | 'scanned_at'> & { scanned_at?: string }

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  list: () => fetch('/api/scans').then((r) => json<Scan[]>(r)),
  create: (s: NewScan) =>
    fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    }).then((r) => json<Scan>(r)),
  remove: (id: number) => fetch(`/api/scans/${id}`, { method: 'DELETE' }),
  exportUrl: '/api/export.csv',
}
