const { Router } = require('express')
const { getDb } = require('../db')

module.exports = function historyRouter(dbPath) {
  const router = Router()

  router.get('/', (req, res) => {
    const db = getDb(dbPath)
    const rows = db.prepare('SELECT * FROM history ORDER BY date DESC LIMIT 50').all()
    res.json(rows.map((r) => ({
      id: r.id,
      date: r.date,
      params: JSON.parse(r.params),
      results: JSON.parse(r.results),
    })))
  })

  router.post('/', (req, res) => {
    const { id, date, params, results } = req.body
    const db = getDb(dbPath)
    db.prepare('INSERT INTO history (id, date, params, results) VALUES (?, ?, ?, ?)')
      .run(id, date, JSON.stringify(params), JSON.stringify(results))
    res.status(201).json({ ok: true })
  })

  router.patch('/:id', (req, res) => {
    const { date } = req.body
    if (!date) return res.status(400).json({ error: 'date is required' })
    const db = getDb(dbPath)
    db.prepare('UPDATE history SET date = ? WHERE id = ?').run(date, req.params.id)
    res.json({ ok: true })
  })

  router.delete('/:id', (req, res) => {
    const db = getDb(dbPath)
    db.prepare('DELETE FROM history WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  // Clear all
  router.delete('/', (req, res) => {
    const db = getDb(dbPath)
    db.prepare('DELETE FROM history').run()
    res.json({ ok: true })
  })

  return router
}
