const { Router } = require('express')
const { getDb } = require('../db')

module.exports = function expensesRouter(dbPath) {
  const router = Router()

  router.get('/', (req, res) => {
    const db = getDb(dbPath)
    const rows = db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all()
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      amount: r.amount,
      month: r.month,
      note: r.note,
      recurring: r.recurring === 1,
      createdAt: r.created_at,
    })))
  })

  router.post('/', (req, res) => {
    const { id, name, category, amount, month, note, recurring } = req.body
    const db = getDb(dbPath)
    db.prepare(`
      INSERT INTO expenses (id, name, category, amount, month, note, recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category, amount, month, note || '', recurring ? 1 : 0)
    res.status(201).json({ ok: true, id })
  })

  router.patch('/:id', (req, res) => {
    const db  = getDb(dbPath)
    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    const updated = {
      name:      req.body.name      ?? row.name,
      category:  req.body.category  ?? row.category,
      amount:    req.body.amount    !== undefined ? Number(req.body.amount) : row.amount,
      note:      req.body.note      ?? row.note,
      recurring: req.body.recurring !== undefined ? (req.body.recurring ? 1 : 0) : row.recurring,
    }
    db.prepare('UPDATE expenses SET name=?, category=?, amount=?, note=?, recurring=? WHERE id=?')
      .run(updated.name, updated.category, updated.amount, updated.note, updated.recurring, req.params.id)
    res.json({ ok: true })
  })

  router.delete('/:id', (req, res) => {
    const db = getDb(dbPath)
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  return router
}
