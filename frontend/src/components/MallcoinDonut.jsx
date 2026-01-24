import React, { useEffect, useState } from 'react'
import { mallcoinMetrics } from '../data/mallcoinMetrics'
import { motion } from 'framer-motion'

function formatPct(n) { return (Math.round(n * 100) / 100).toFixed(2) + '%' }

export default function MallcoinDonut({ data }) {
  const [metrics, setMetrics] = useState(data || mallcoinMetrics)

  useEffect(() => {
    let mounted = true
    const base = import.meta.env.VITE_API_BASE || ''
    fetch(`${base}/api/market/supply`).then(r => r.json()).then(j => {
      if (!mounted) return
      if (!j || !j.total_supply) return
      const proto = j.total_supply.raw_proto || {}
      // prefer if chain provides breakdown fields
      const tryNum = (v) => (v == null ? null : Number(v) / 1_000_000)
      const bought = tryNum(proto.bought) || tryNum(proto.bought_amount) || null
      const minted = tryNum(proto.minted) || tryNum(proto.minted_amount) || null
      const awarded = tryNum(proto.awarded) || tryNum(proto.awarded_amount) || null
      if (bought != null && minted != null && awarded != null) {
        setMetrics({ totalSupply: (j.total_supply.supply || 0), bought, minted, awarded })
      } else {
        const keys = ['bought', 'minted', 'awarded']
        const found = keys.every(k => proto[k] != null)
        if (found) {
          setMetrics({ totalSupply: (j.total_supply.supply || 0), bought: proto.bought / 1_000_000, minted: proto.minted / 1_000_000, awarded: proto.awarded / 1_000_000 })
        }
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const d = metrics || mallcoinMetrics
  const total = (d.totalSupply || 0) || (d.bought + d.minted + d.awarded)
  const bought = d.bought || 0
  const minted = d.minted || 0
  const awarded = d.awarded || 0
  const sum = bought + minted + awarded || total || 1

  const pctBought = bought / sum
  const pctMinted = minted / sum
  const pctAwarded = awarded / sum

  const size = 220
  const center = size / 2

  const rings = [
    { r: 88, stroke: 14, value: pctBought, color: '#2563eb', label: 'Bought' },
    { r: 66, stroke: 14, value: pctMinted, color: '#22c55e', label: 'Minted' },
    { r: 44, stroke: 14, value: pctAwarded, color: '#f59e0b', label: 'Awarded' },
  ]

  return (
    <div style={{display:'flex',gap:18,alignItems:'center'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${center},${center})`}>
          {rings.map((ring, i) => {
            const circumference = 2 * Math.PI * ring.r
            const dash = Math.max(0.0001, ring.value) * circumference
            const gap = Math.max(0, circumference - dash)
            const trackColor = '#e6eefb'
            return (
              <g key={i}>
                <circle
                  r={ring.r}
                  cx={0}
                  cy={0}
                  fill="none"
                  stroke={trackColor}
                  strokeWidth={ring.stroke}
                />
                <motion.circle
                  r={ring.r}
                  cx={0}
                  cy={0}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ring.stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  transform={`rotate(-90)`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.9, delay: i * 0.12, ease: 'easeOut' }}
                />
              </g>
            )
          })}

          <g>
            <text x={0} y={-6} textAnchor="middle" style={{fontSize:18, fontWeight:700}}>
              {((bought / sum) * 100).toFixed(1)}%
            </text>
            <text x={0} y={16} textAnchor="middle" style={{fontSize:12, opacity:0.85}}>
              Bought share
            </text>
          </g>
        </g>
      </svg>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {rings.map((r, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:12,height:12,background:r.color,borderRadius:3}} />
            <div style={{flex:'1 1 auto'}}>{r.label}</div>
            <div style={{fontWeight:700}}>{formatPct(r.value * 100)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
