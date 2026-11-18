import { useEffect, useRef, useState, useCallback } from 'react'

export type Position = { latitude: number; longitude: number; accuracy: number }

export function useGeolocation() {
  const [pos, setPos] = useState<Position | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const watchId = useRef<number | null>(null)

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Browser tidak mendukung GPS')
      setLoading(false)
      return
    }
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    setLoading(true)
    setError(null)
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy })
        setLoading(false)
      },
      (e) => {
        setError(
          e.code === e.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser.'
            : 'Gagal mendapatkan lokasi GPS',
        )
        setLoading(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
  }, [])

  useEffect(() => {
    start()
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [start])

  return { pos, error, loading, refresh: start }
}
