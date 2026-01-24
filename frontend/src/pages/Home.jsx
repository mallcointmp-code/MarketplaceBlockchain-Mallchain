import React, { useEffect, useState } from 'react'
import './home.css'

function Sidebar() {
  return (
    <aside className="home-sidebar">
      <div className="brand">Mallchain</div>
      <nav>
        <button className="sb-item active">Dashboard</button>
        <button className="sb-item">Portfolio</button>
        <button className="sb-item">Analysis</button>
        <button className="sb-item">Community</button>
      </nav>
    </aside>
  )
}

function TopBar() {
  return (
    <div className="home-topbar">
      <h2>Welcome, Mall</h2>
      <div className="top-actions">
        <input className="search" placeholder="Search" />
        <div className="avatar" />
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

function SimpleChart() {
  // simple SVG line chart
  const points = Array.from({ length: 20 }, (_, i) => 60 + Math.sin(i / 3) * 20 + Math.random() * 8)
  const step = 100 / (points.length - 1)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step},${100 - p}`).join(' ')
  return (
    <div>
      <h3>Portfolio Performance</h3>
      <svg viewBox="0 0 100 100" className="chart">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#61dafb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="1.4" strokeLinecap="round" />
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
      <Sidebar />
      <div className="home-main">
        <TopBar />
        <div className="home-content">
          <StatsCards />
          <div className="main-grid">
            <div className="chart-card"><SimpleChart /></div>
            <div className="table-card"><HoldingsTable /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
