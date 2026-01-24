import React, { useEffect, useState, useRef } from 'react'
import './home.css'

function TopBar() {
  return (
      <div className="home-topbar">
      <div style={{display:'flex', alignItems:'center'}}>
        <button
          className="back-btn"
          aria-label="Back to landing"
          onClick={() => {
            try {
              if (window && window.__landingNavigate) window.__landingNavigate('landing')
              else window.location.href = '/'
            } catch (e) { window.location.href = '/' }
          }}
        >
          ←
        </button>

        <h2 style={{margin:0}}>Welcome, Mall</h2>
      </div>
    </div>
  )
}

function StatsCards() {
  const [supply, setSupply] = useState('12,304.11')
    const [circulating, setCirculating] = useState('4,500')
  const [selectedRange, setSelectedRange] = useState('1h')
  const [market, setMarket] = useState({ market_price: null, history: [], aggregates: {} })

  useEffect(() => {
    let mounted = true
    const base = import.meta.env.VITE_API_BASE || ''
    fetch(`${base}/api/market/supply`).then((r) => r.json()).then((j) => {
      if (!mounted) return
      const ts = j && j.total_supply && (j.total_supply.supply || (j.total_supply.raw ? j.total_supply.raw / 1000000 : null))
      if (ts != null) setSupply(Number(ts).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }))
        // circulating supply (if provided)
        const circ = j && j.total_supply && (j.total_supply.circulating || (j.total_supply.circulating_raw ? j.total_supply.circulating_raw / 1000000 : null))
        if (circ != null) setCirculating(Number(circ).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }))
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // listen to shared market endpoint (the hook below also polls). Poll once on mount
  useEffect(() => {
    let mounted = true
    const base = import.meta.env.VITE_API_BASE || ''
    const load = async () => {
      try {
        const res = await fetch(`${base}/api/market/price`)
        if (!res.ok) return
        const j = await res.json()
        if (!mounted) return
        setMarket(j || {})
      } catch (e) {}
    }
    load()
    return () => { mounted = false }
  }, [])

  const RANGES = {
    '5m': 1000 * 60 * 5,
    '10m': 1000 * 60 * 10,
    '30m': 1000 * 60 * 30,
    '1h': 1000 * 60 * 60,
    '12h': 1000 * 60 * 60 * 12,
    '24h': 1000 * 60 * 60 * 24,
    '7d': 1000 * 60 * 60 * 24 * 7,
    '15d': 1000 * 60 * 60 * 24 * 15,
    '30d': 1000 * 60 * 60 * 24 * 30,
    '5M': 1000 * 60 * 60 * 24 * 30 * 5
  }

  const computeChange = (rangeKey) => {
    // Prefer server-side aggregates when available
    const agg = market && market.aggregates && market.aggregates[rangeKey]
    if (agg) return agg
    // fallback to local history computation if server didn't provide
    const now = Date.now()
    const rangeMs = RANGES[rangeKey] || RANGES['1h']
    const priceHistory = (market && market.history) || []
    if (!priceHistory.length) return null
    const latest = priceHistory[priceHistory.length - 1]
    const cutoff = now - rangeMs
    let past = null
    for (let i = priceHistory.length - 1; i >= 0; i--) {
      if (priceHistory[i].ts <= cutoff) { past = priceHistory[i]; break }
    }
    if (!past) past = priceHistory[0]
    if (!past || !latest || past.mid === 0) return null
    const pct = ((latest.mid - past.mid) / past.mid) * 100
    return { pct, latest: latest.mid, past: past.mid }
  }

  function PriceChangeValue() {
    const change = computeChange(selectedRange)
    let display = '—'
    let color = '#6b7280'
    let arrow = ''
    if (change) {
      const pct = change.pct
      const sign = pct >= 0 ? '+' : ''
      display = `${sign}${pct.toFixed(2)}%`
      if (pct > 0) { color = '#22c55e'; arrow = '▲' }
      else if (pct < 0) { color = '#ef4444'; arrow = '▼' }
      else { color = '#2563eb'; arrow = '' }
    }

    return (
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{Display:'flex',alignItems:'center',gap:8, color}}><span style={{fontSize:14}}>{arrow}</span><span>{display}</span></div>
        <div style={{display:'flex',flexWrap:'wrap'}}>
          {Object.keys(RANGES).map(k => (
            <button key={k} onClick={() => setSelectedRange(k)} aria-pressed={k===selectedRange} style={{marginRight:6, marginBottom:6, padding:'2px 8px', fontSize:12, background:k===selectedRange? '#eef2ff':'transparent', border:'1px solid #e5e7eb', borderRadius:6, display:'inline-flex', alignItems:'center', gap:6}}>
              <span style={{fontSize:12, opacity:0.8}}>⏱️</span>
              <span>{k}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Supply of Mallcoins', value: supply },
      { label: 'Circulating Supply', value: circulating },
    { label: 'Price Change', value: <PriceChangeValue /> },
    { label: 'Active Assets', value: '12' },
  ]
  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div key={i} className="stat-card">
          <div className="label">{s.label}</div>
          <div className="value">{s.value}</div>
        </div>
      ))}
    </div>
  )
}

function DynamicChart() {
  const [points, setPoints] = useState(() => Array.from({ length: 40 }, () => 0))
  const [current, setCurrent] = useState(0)
  const [buy, setBuy] = useState(null)
  const [sell, setSell] = useState(null)
  const [currencyLabel, setCurrencyLabel] = useState('')
  const [displayColor, setDisplayColor] = useState('#2563eb')
  const prevOnchainRef = useRef(null)
  const [market, setMarket] = useState({ market_price: null, history: [], aggregates: {} })

  // Use shared backend `/api/market/price` history/market data to render chart
  useEffect(() => {
    let mounted = true
    const base = import.meta.env.VITE_API_BASE || ''
    const load = async () => {
      try {
        const res = await fetch(`${base}/api/market/price`)
        if (!res.ok) return
        const j = await res.json()
        if (!mounted) return
        setMarket(j || {})
        const mp = j && j.market_price
        if (mp) {
          const buyP = Number(mp.buy_price)
          const sellP = Number(mp.sell_price)
          setBuy(buyP)
          setSell(sellP)
          setCurrencyLabel('Ksh')
          const mid = Number(mp.mid || ((buyP + sellP) / 2))
          // push points from history if available
          const history = (j && j.history) || []
          if (history && history.length) {
            const recent = history.slice(-40).map(p => p.mid)
            setPoints(() => recent.length === 40 ? recent : Array.from({ length: 40 - recent.length }, () => recent[0] || 0).concat(recent))
            setCurrent(history[history.length - 1].mid)
          } else {
            setPoints(prev => prev.slice(1).concat(mid))
            setCurrent(mid)
          }
        }
      } catch (e) {
        // fallback simulation to keep chart alive
        setPoints((prev) => {
          const last = prev[prev.length - 1] || 0.6
          const next = Math.max(0.01, last * (1 + (Math.random() - 0.5) * 0.02))
          setCurrent(next)
          return prev.slice(1).concat(next)
        })
      }
    }
    load()
    const iv = setInterval(load, 15000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  // update displayed color only when on-chain mid price changes
  useEffect(() => {
    const onchainMid = market && market.market_price && market.market_price.mid
    if (onchainMid == null) return
    const prev = prevOnchainRef.current
    if (prev == null) {
      prevOnchainRef.current = onchainMid
      return
    }
    if (onchainMid > prev) setDisplayColor('#22c55e')
    else if (onchainMid < prev) setDisplayColor('#ef4444')
    else setDisplayColor('#2563eb')
    prevOnchainRef.current = onchainMid
  }, [market])

  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const scaled = points.map((p) => ((p - min) / range) * 80 + 10)
  const step = 100 / (scaled.length - 1)
  // build path starting from the lower-left corner (0,100)
  const basePath = ['M 0,100']
  scaled.forEach((p, i) => {
    const x = i * step
    const y = 100 - p
    basePath.push(`L ${x},${y}`)
  })
  const path = basePath.join(' ')

  // stroke color follows `displayColor`, which only updates when on-chain price state changes
  const strokeColor = displayColor

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3>Portfolio Performance</h3>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:14,opacity:0.8}}>Current</div>
          <div style={{fontWeight:700}}>{current.toFixed(2)} {currencyLabel}</div>
          {buy != null && sell != null && (
            <div style={{fontSize:12,opacity:0.85}}>Buy {buy.toFixed(2)} · Sell {sell.toFixed(2)}</div>
          )}
        </div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMinYMax meet" className="chart">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#61dafb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function HoldingsTable() {
  const rows = [
    ['Founder', '250,000,000 MLCN', '—'],
    ['AFA', '1,500,000 MLCN', '—'],
    ['Partner (Orthopharm)', '3,000,000 MLCN', '—'],
  ]
  return (
    <div>
      <h3>Watchlist</h3>
      <div className="watchlist">
        {rows.map((r, i) => (
          <div className="watch-row" key={i}>
            <span>{r[0]}</span>
            <span>{r[1]}</span>
            <span className={r[2].startsWith('+') ? 'up' : 'down'}>{r[2]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home(){
  return (
    <div className="home-root">
      <div className="home-main">
        <TopBar />
          <div className="home-content">
            <StatsCards />
            <div className="main-grid">
              <div className="chart-card"><DynamicChart /></div>
              <div className="table-card"><HoldingsTable /></div>
            </div>
          </div>
      </div>
    </div>
  )
}
