// Uses Node.js built-in sqlite module (node >= 22.5, no npm install needed)
const { DatabaseSync } = require('node:sqlite')
const path = require('path')

let _db = null

function getDb(dbPath) {
  if (!_db) {
    _db = new DatabaseSync(path.join(dbPath, 'payprecision.db'))
    initSchema(_db)
  }
  return _db
}

function initSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS history (
      id         TEXT PRIMARY KEY,
      date       TEXT NOT NULL,
      params     TEXT NOT NULL,
      results    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT DEFAULT '',
      target_amount REAL NOT NULL DEFAULT 0,
      saved_amount  REAL NOT NULL DEFAULT 0,
      has_image     INTEGER NOT NULL DEFAULT 0,
      savings_rate  REAL NOT NULL DEFAULT 0.10,
      category      TEXT NOT NULL DEFAULT 'Other',
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      category   TEXT NOT NULL,
      amount     REAL NOT NULL DEFAULT 0,
      month      TEXT NOT NULL,
      note       TEXT DEFAULT '',
      recurring  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id         TEXT PRIMARY KEY,
      goal_id    TEXT NOT NULL,
      amount     REAL NOT NULL DEFAULT 0,
      month      TEXT NOT NULL,
      note       TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id         TEXT PRIMARY KEY,
      category   TEXT NOT NULL,
      month      TEXT NOT NULL,
      amount     REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS budgets_cat_month ON budgets(category, month);

    CREATE TABLE IF NOT EXISTS ai_reimbursements (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      amount     REAL NOT NULL DEFAULT 10,
      applied    INTEGER NOT NULL DEFAULT 0,
      has_logo   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS laptop_reimbursements (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      ram            TEXT DEFAULT '',
      ssd            TEXT DEFAULT '',
      gpu            TEXT DEFAULT '',
      processor      TEXT DEFAULT '',
      total_amount   REAL NOT NULL DEFAULT 0,
      monthly_amount REAL NOT NULL DEFAULT 0,
      start_date     TEXT DEFAULT '',
      has_image      INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loans (
      id                  TEXT PRIMARY KEY,
      lender_name         TEXT NOT NULL,
      amount              REAL NOT NULL DEFAULT 0,
      currency            TEXT NOT NULL DEFAULT 'PKR',
      loan_date           TEXT NOT NULL,
      purpose             TEXT DEFAULT '',
      goal_id             TEXT DEFAULT NULL,
      monthly_installment REAL NOT NULL DEFAULT 0,
      status              TEXT NOT NULL DEFAULT 'active',
      notes               TEXT DEFAULT '',
      has_image           INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loan_payments (
      id           TEXT PRIMARY KEY,
      loan_id      TEXT NOT NULL,
      amount       REAL NOT NULL DEFAULT 0,
      payment_date TEXT NOT NULL,
      note         TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'Other',
      purchase_price REAL NOT NULL DEFAULT 0,
      current_value  REAL NOT NULL DEFAULT 0,
      purchase_date  TEXT NOT NULL,
      goal_id        TEXT DEFAULT NULL,
      notes          TEXT DEFAULT '',
      has_image      INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      issuer         TEXT NOT NULL DEFAULT '',
      date_earned    TEXT NOT NULL DEFAULT '',
      credential_url TEXT DEFAULT '',
      notes          TEXT DEFAULT '',
      created_at     TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migrations — add new columns if they don't exist yet
  try { db.exec('ALTER TABLE expenses ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0') } catch (_) {}
  try { db.exec('ALTER TABLE goals ADD COLUMN savings_rate REAL NOT NULL DEFAULT 0.10') } catch (_) {}
  try { db.exec('ALTER TABLE laptop_reimbursements ADD COLUMN applied INTEGER NOT NULL DEFAULT 1') } catch (_) {}
  try { db.exec('ALTER TABLE assets ADD COLUMN goal_id TEXT DEFAULT NULL') } catch (_) {}
  try { db.exec("ALTER TABLE goals ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'") } catch (_) {}
}

function _reset() { _db = null }

module.exports = { getDb, _reset }
