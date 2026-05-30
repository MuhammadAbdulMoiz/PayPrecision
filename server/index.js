const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db')
const PORT = process.env.PORT || 3001

// Ensure db directories exist on startup
fs.mkdirSync(path.join(DB_PATH, 'images'), { recursive: true })

// Parse JSON bodies — allow large base64 images
app.use(express.json({ limit: '100mb' }))

// Admin routes (token-protected)
app.use('/admin', require('./routes/admin')(DB_PATH))

// API routes
app.use('/api/history',  require('./routes/history')(DB_PATH))
app.use('/api/goals',    require('./routes/goals')(DB_PATH))
app.use('/api/expenses', require('./routes/expenses')(DB_PATH))
app.use('/api/deposits', require('./routes/deposits')(DB_PATH))
app.use('/api/budgets',  require('./routes/budgets')(DB_PATH))
app.use('/api/images',          require('./routes/images')(DB_PATH))
app.use('/api/reimbursements',  require('./routes/reimbursements')(DB_PATH))
app.use('/api/loans',           require('./routes/loans')(DB_PATH))
app.use('/api/assets',          require('./routes/assets')(DB_PATH))
app.use('/api/certifications',  require('./routes/certifications')(DB_PATH))

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`PayPrecision server running on port ${PORT}`)
  console.log(`Database path: ${DB_PATH}`)
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`)
})
