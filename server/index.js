// API server: Express + SQLite (node:sqlite bawaan Node >= 22.5)
import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'

const PORT = process.env.PORT || 3001
const dataDir = path.resolve(import.meta.dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(path.join(dataDir, 'scans.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT NOT NULL,
    format TEXT,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    note TEXT,
    source TEXT,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/scans', (_req, res) => {
  res.json(db.prepare('SELECT * FROM scans ORDER BY id DESC').all())
})

app.post('/api/scans', (req, res) => {
  const { barcode, format, latitude, longitude, accuracy, note, source, scanned_at } = req.body ?? {}
  if (!barcode || typeof barcode !== 'string') {
    return res.status(400).json({ error: 'barcode wajib diisi' })
  }
  const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
  const info = db
    .prepare(
      `INSERT INTO scans (barcode, format, latitude, longitude, accuracy, note, source, scanned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    )
    .run(
      barcode.trim(),
      format ?? null,
      num(latitude),
      num(longitude),
      num(accuracy),
      note ?? null,
      source ?? null,
      scanned_at ?? null,
    )
  res.status(201).json(db.prepare('SELECT * FROM scans WHERE id = ?').get(info.lastInsertRowid))
})

app.delete('/api/scans/:id', (req, res) => {
  db.prepare('DELETE FROM scans WHERE id = ?').run(Number(req.params.id))
  res.status(204).end()
})

const csvCell = (v) => {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = "'" + s // cegah CSV injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

app.get('/api/export.csv', (_req, res) => {
  const rows = db.prepare('SELECT * FROM scans ORDER BY id').all()
  const cols = ['id', 'barcode', 'format', 'latitude', 'longitude', 'accuracy', 'note', 'source', 'scanned_at']
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="geoscan-export.csv"')
  res.send('\ufeff' + csv)
})

// Production: layani hasil build
const dist = path.resolve(import.meta.dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => console.log(`API siap di http://localhost:${PORT}`))
