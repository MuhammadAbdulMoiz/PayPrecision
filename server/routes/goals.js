const { Router } = require('express')
const { getDb } = require('../db')

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    hasImage: row.has_image === 1,
    savingsRate: row.savings_rate ?? 0.10,
    category: row.category ?? 'Other',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = function goalsRouter(dbPath) {
  const router = Router()

  router.get('/', (req, res) => {
    const db = getDb(dbPath)
    const rows = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all()
    res.json(rows.map(toClient))
  })

  router.post('/', (req, res) => {
    const { id, name, description, targetAmount, savedAmount, hasImage, savingsRate, category } = req.body
    const db = getDb(dbPath)
    db.prepare(`
      INSERT INTO goals (id, name, description, target_amount, saved_amount, has_image, savings_rate, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description || '', targetAmount, savedAmount || 0, hasImage ? 1 : 0, savingsRate ?? 0.10, category || 'Other')
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id)
    res.status(201).json(toClient(row))
  })

  router.patch('/:id', (req, res) => {
    const db = getDb(dbPath)
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'not found' })
    const updated = {
      name:          req.body.name          !== undefined ? req.body.name          : row.name,
      description:   req.body.description   !== undefined ? req.body.description   : row.description,
      target_amount: req.body.targetAmount  !== undefined ? Number(req.body.targetAmount) : row.target_amount,
      saved_amount:  req.body.savedAmount   !== undefined ? req.body.savedAmount   : row.saved_amount,
      savings_rate:  req.body.savingsRate   !== undefined ? req.body.savingsRate   : (row.savings_rate ?? 0.10),
      has_image:     req.body.hasImage      !== undefined ? (req.body.hasImage ? 1 : 0) : row.has_image,
      category:      req.body.category      !== undefined ? req.body.category      : (row.category ?? 'Other'),
    }
    db.prepare(`
      UPDATE goals SET name=?, description=?, target_amount=?, saved_amount=?, savings_rate=?, has_image=?, category=?, updated_at=datetime('now') WHERE id=?
    `).run(updated.name, updated.description, updated.target_amount, updated.saved_amount, updated.savings_rate, updated.has_image, updated.category, req.params.id)
    res.json(toClient(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id)))
  })

  router.delete('/:id', (req, res) => {
    const db = getDb(dbPath)
    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  return router
}
