const express = require('express')
const { randomUUID } = require('crypto')
const { getDb } = require('../db')

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    purchasePrice: row.purchase_price,
    currentValue: row.current_value,
    purchaseDate: row.purchase_date,
    goalId: row.goal_id ?? null,
    notes: row.notes,
    hasImage: row.has_image === 1,
    createdAt: row.created_at,
  }
}

module.exports = function assetsRouter(dbPath) {
  const router = express.Router()
  const db = () => getDb(dbPath)

  router.get('/', (_req, res) => {
    const rows = db().prepare('SELECT * FROM assets ORDER BY created_at DESC').all()
    res.json(rows.map(toClient))
  })

  router.post('/', (req, res) => {
    const { name, category = 'Other', purchasePrice, currentValue, purchaseDate, goalId = null, notes = '' } = req.body
    if (!name || !purchaseDate) return res.status(400).json({ error: 'name and purchaseDate are required' })
    const id = randomUUID()
    const price = Number(purchasePrice) || 0
    const value = currentValue !== undefined ? Number(currentValue) : price
    db().prepare(`
      INSERT INTO assets (id, name, category, purchase_price, current_value, purchase_date, goal_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category, price, value, purchaseDate, goalId || null, notes)
    res.status(201).json(toClient(db().prepare('SELECT * FROM assets WHERE id = ?').get(id)))
  })

  router.patch('/:id', (req, res) => {
    const { id } = req.params
    const row = db().prepare('SELECT * FROM assets WHERE id = ?').get(id)
    if (!row) return res.status(404).json({ error: 'Not found' })

    const updated = {
      name: req.body.name ?? row.name,
      category: req.body.category ?? row.category,
      purchase_price: req.body.purchasePrice !== undefined ? Number(req.body.purchasePrice) : row.purchase_price,
      current_value: req.body.currentValue !== undefined ? Number(req.body.currentValue) : row.current_value,
      purchase_date: req.body.purchaseDate ?? row.purchase_date,
      goal_id: req.body.goalId !== undefined ? (req.body.goalId || null) : (row.goal_id ?? null),
      notes: req.body.notes ?? row.notes,
      has_image: req.body.hasImage !== undefined ? (req.body.hasImage ? 1 : 0) : row.has_image,
    }

    db().prepare(`
      UPDATE assets SET name=?, category=?, purchase_price=?, current_value=?, purchase_date=?, goal_id=?, notes=?, has_image=?, updated_at=datetime('now')
      WHERE id=?
    `).run(updated.name, updated.category, updated.purchase_price, updated.current_value, updated.purchase_date, updated.goal_id, updated.notes, updated.has_image, id)

    res.json(toClient(db().prepare('SELECT * FROM assets WHERE id = ?').get(id)))
  })

  router.delete('/:id', (req, res) => {
    db().prepare('DELETE FROM assets WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  return router
}
