# PayPrecision

A self-hosted personal dashboard for fresh graduates and early-career professionals. Tracks salary, finances, owned items, and everything in between — stored locally, no cloud required.

> Built entirely with [Claude Code](https://claude.ai/claude-code).

---

## What it does

PayPrecision started as a salary calculator for Pakistani employees (USD income → PKR) and grew into a full personal management tool. Everything is manual and deliberate — you record what matters, the app shows you the picture.

---

## Features

### Salary Calculator
- USD → PKR with configurable exchange rate
- Intern and full-time modes
- Dynamic working days (public holidays, leave days, extra/overtime days)
- Overtime at 1.5× rate, leave deductions, leave-extra offset logic
- Attendance bonuses (1-month / 3-month / 6-month tiers)
- Provident fund deduction (full-time only)
- Annual bonus (fixed amount or % of salary)
- Income tax estimate (FY 2024-25 salaried brackets, Pakistan)
- Real-time reactive calculations — no Calculate button needed
- PDF invoice export, annual report PDF, CSV history export

### Reimbursements
- AI subscription reimbursements with per-provider logos
- Laptop installment tracker (36-month plan, progress and remaining balance)

### Financial Goals
- Set savings targets with per-goal savings rates (5%–30% of salary)
- Log monthly deposits per goal
- Time-to-completion estimate based on current salary
- Progress bars and optional goal images

### Owned Items (Physical Assets)
- Log anything you own: monitor, phone, chair, keyboard, vehicle, etc.
- Categories: Electronics, Furniture, Vehicle, Appliances, Tools, Other
- Record purchase price and manually set current estimated value
- Shows appreciation / depreciation vs what you originally paid
- Photo upload per item
- All items count toward your net worth

### Loan Tracker
- Track borrowed money (family, friends, banks)
- Log payments, see remaining balance and repayment progress
- Link loans to specific goals
- Progress bar showing % repaid

### Expense Tracker
- 11 spending categories (Housing, Food, Transport, Subscriptions, Trips, Treats, Utilities, Healthcare, Education, Shopping, Other)
- Monthly budgets per category with circular progress indicators
- Mark expenses as recurring (auto-fills next month)
- Spending donut chart and horizontal bar chart
- Expense health indicator: spending vs salary (Healthy / Caution / Over budget)
- CSV export

### Insights
- 6-month expense trend by category (selectable)
- Salary growth chart (last 12 history entries)
- Net worth = goal savings + owned item values − loans − manual liabilities
- Manual liability management with payment tracking

### History
- Save salary calculations to history with full parameter snapshot
- Search, filter by month/year, delete entries
- Salary projection line chart

### Settings
- Show/hide pages (History, Goals, Insights)
- Database backup, restore, and import
- Dark/light theme

---

## Tech Stack

| Layer | Details |
|---|---|
| Frontend | React 19, Tailwind CSS v4, Vite 8 |
| Backend | Node.js + Express |
| Database | SQLite via `node:sqlite` (built-in, no ORM, WAL mode) |
| Images | Base64 → disk, served as static files from `/db/images/` |
| Container | Podman / Docker (multi-stage build) |

No external database, no cloud, no auth. Runs entirely on your machine.

---

## Running with Podman

**Build:**
```bash
podman build -t payprecision .
```

**Run:**
```bash
podman run -d \
  --name payprecision \
  -p 3000:3000 \
  -v payprecision-db:/db \
  localhost/payprecision:latest
```

**Update to latest build:**
```bash
podman build -t payprecision .
podman stop payprecision && podman rm payprecision
podman run -d --name payprecision -p 3000:3000 -v payprecision-db:/db localhost/payprecision:latest
```

Open at [http://localhost:3000](http://localhost:3000).

The `payprecision-db` volume holds the SQLite database and all uploaded images. It persists across container restarts and rebuilds.

---

## Running in Dev Mode

```bash
# Terminal 1 — frontend
npm install
npm run dev

# Terminal 2 — backend
cd server
npm install
node index.js
```

Frontend at [http://localhost:5173](http://localhost:5173), backend at port 3001.

---

## Data & Privacy

Everything is stored in a single SQLite file inside the named Podman volume. Nothing leaves your machine. The Settings page has full backup, restore, and database export tools.

---

## Calculation Logic

```
monthlyPKR     = income × dollarRate
dailyWage      = monthlyPKR ÷ workingDays
overtimeRate   = dailyWage × 1.5
offsetDays     = min(leaveDays, extraDays)
overtimeDays   = extraDays − offsetDays
unpaidLeave    = leaveDays − offsetDays
extraPay       = overtimeDays × overtimeRate
leaveDeduction = unpaidLeave × dailyWage
finalSalary    = monthlyPKR + extraPay − leaveDeduction + attendanceBonus − providentFund
```
