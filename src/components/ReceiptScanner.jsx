import { useState, useRef } from 'react'

// Parse OCR text into structured fields
function parseReceipt(text) {
  const rawLines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // ── Amount: prefer lines mentioning total/amount/grand, else largest number ──
  const numFrom = (s) => {
    const matches = s.match(/\d[\d,]*\.?\d{0,2}/g)
    if (!matches) return []
    return matches.map((m) => parseFloat(m.replace(/,/g, ''))).filter((n) => !isNaN(n))
  }

  let amount = null
  const totalLine = rawLines.find((l) => /total|amount|grand|payable|net/i.test(l) && /\d/.test(l))
  if (totalLine) {
    const nums = numFrom(totalLine)
    if (nums.length) amount = Math.max(...nums)
  }
  if (amount === null) {
    const allNums = rawLines.flatMap(numFrom).filter((n) => n >= 1)
    if (allNums.length) amount = Math.max(...allNums)
  }

  // ── Date ──
  let date = null
  const dateMatch = text.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/) ||
                    text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/)
  if (dateMatch) {
    const parsed = new Date(dateMatch[1].replace(/\./g, '/'))
    if (!isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10)
  }

  // ── Merchant: first line that looks like a name (letters, not just numbers) ──
  const merchant = rawLines.find((l) => /[a-zA-Z]{3,}/.test(l) && !/total|amount|receipt|invoice|date|tax/i.test(l))

  return { amount, date, merchant: merchant || '' }
}

export default function ReceiptScanner({ onClose, onParsed }) {
  const [stage, setStage] = useState('upload') // upload | scanning | review
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [parsed, setParsed] = useState({ amount: '', date: '', merchant: '' })
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setPreview(dataUrl)
      setStage('scanning')
      setProgress(0)
      try {
        const Tesseract = (await import('tesseract.js')).default
        const { data } = await Tesseract.recognize(dataUrl, 'eng', {
          logger: (m) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) },
        })
        const result = parseReceipt(data.text || '')
        setParsed({
          amount: result.amount ? String(result.amount) : '',
          date: result.date || new Date().toISOString().slice(0, 10),
          merchant: result.merchant,
        })
        setStage('review')
      } catch (err) {
        setError('Could not read the receipt. Try a clearer photo or enter manually.')
        setStage('upload')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleUse = () => {
    onParsed({
      name: parsed.merchant || 'Receipt expense',
      amount: parsed.amount,
      date: parsed.date,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Scan Receipt</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        {stage === 'upload' && (
          <div>
            <button onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 py-10 transition-colors hover:border-blue-400/50 hover:bg-white/10">
              <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              <span className="text-sm font-medium text-slate-300">Upload receipt photo</span>
              <span className="text-[11px] text-slate-500">Reads amount, date &amp; merchant automatically</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}
          </div>
        )}

        {stage === 'scanning' && (
          <div className="flex flex-col items-center gap-3 py-6">
            {preview && <img src={preview} alt="receipt" className="h-32 w-auto rounded-lg object-contain opacity-50" />}
            <p className="text-sm text-slate-300">Reading receipt… {progress}%</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {stage === 'review' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">Review the extracted details before saving:</p>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Merchant / Name</label>
              <input value={parsed.merchant} onChange={(e) => setParsed((p) => ({ ...p, merchant: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount (PKR)</label>
                <input type="number" value={parsed.amount} onChange={(e) => setParsed((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date</label>
                <input type="date" value={parsed.date} onChange={(e) => setParsed((p) => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setStage('upload'); setPreview(null) }}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">Rescan</button>
              <button onClick={handleUse}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500">Use Details</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
