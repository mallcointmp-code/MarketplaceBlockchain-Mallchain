import React, { useEffect, useState } from 'react'
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
  const stats = [
    { label: 'Total Holding', value: '$12,304.11' },
    { label: 'Monthly Return', value: '+4.55%' },
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
  const [points, setPoints] = useState(() =>
    Array.from({ length: 40 }, () => 0)
  )
  const [current, setCurrent] = useState(0)
  const [buy, setBuy] = useState(null)
  const [sell, setSell] = useState(null)
  const [currencyLabel, setCurrencyLabel] = useState('')

  useEffect(() => {
    // detect Kenya by locale / language and set buy/sell accordingly
    let isKenya = false
    try {
      const lang = (navigator.language || '').toLowerCase()
      if (lang.includes('ke') || lang.includes('-ke')) isKenya = true
      const ro = Intl && Intl.NumberFormat && Intl.NumberFormat().resolvedOptions()
      if (ro && ro.locale && String(ro.locale).toLowerCase().includes('-ke')) isKenya = true
    } catch (e) {}

    if (isKenya) {
      const buyP = 0.62
      const sellP = 0.58
      setBuy(buyP)
      setSell(sellP)
      setCurrencyLabel('KES')
      const mid = (buyP + sellP) / 2
      const init = Array.from({ length: 40 }, (_, i) => mid * (1 + (Math.random() - 0.5) * 0.02))
      setPoints(init)
      setCurrent(init[init.length - 1])

      const iv = setInterval(() => {
        setPoints((prev) => {
          const last = prev[prev.length - 1] || mid
          const drift = (mid - last) * 0.02
          const volatility = (Math.random() - 0.5) * 0.01 * mid
          let next = last + drift + volatility
          if (Math.random() < 0.03) next = next * (1 + (Math.random() - 0.5) * 0.2)
          next = Math.max(sellP * 0.9, Math.min(buyP * 1.1, next))
          const out = prev.slice(1).concat(next)
          setCurrent(next)
          return out
        })
      }, 1200)

      return () => clearInterval(iv)
    } else {
      const base = 0.6
      setBuy(null)
      setSell(null)
      setCurrencyLabel('USD')
      const init = Array.from({ length: 40 }, (_, i) => base * (1 + (Math.random() - 0.5) * 0.04))
      setPoints(init)
      setCurrent(init[init.length - 1])
      const iv = setInterval(() => {
        setPoints((prev) => {
          const last = prev[prev.length - 1] || base
          const next = Math.max(0.1, last * (1 + (Math.random() - 0.5) * 0.02))
          setCurrent(next)
          return prev.slice(1).concat(next)
        })
      }, 1200)
      return () => clearInterval(iv)
    }
  }, [])

  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const scaled = points.map((p) => ((p - min) / range) * 80 + 10)
  const step = 100 / (scaled.length - 1)
  const path = scaled.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step},${100 - p}`).join(' ')

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
      <svg viewBox="0 0 100 100" className="chart">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#61dafb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function HoldingsTable() {
  const rows = [
    ['TSLA', '$230.11', '+2.1%'],
    ['AAPL', '$182.34', '+1.3%'],
    ['AMZN', '$152.80', '-0.4%'],
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
