const express = require('express')
const { randomUUID } = require('crypto')
const { getDb } = require('../db')

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    dateEarned: row.date_earned,
    credentialUrl: row.credential_url,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

module.exports = function certificationsRouter(dbPath) {
  const router = express.Router()
  const db = () => getDb(dbPath)

  router.get('/', (_req, res) => {
    const rows = db().prepare('SELECT * FROM certifications ORDER BY date_earned DESC, created_at DESC').all()
    res.json(rows.map(toClient))
  })

  router.post('/', (req, res) => {
    const { name, issuer = '', dateEarned = '', credentialUrl = '', notes = '' } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const id = randomUUID()
    db().prepare(`
      INSERT INTO certifications (id, name, issuer, date_earned, credential_url, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, issuer, dateEarned, credentialUrl, notes)
    res.status(201).json(toClient(db().prepare('SELECT * FROM certifications WHERE id = ?').get(id)))
  })

  router.delete('/:id', (req, res) => {
    db().prepare('DELETE FROM certifications WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  return router
}
