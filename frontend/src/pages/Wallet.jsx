import React from 'react'
import { useEffect, useState } from 'react'
import { QRCodeSVG as QRCode } from 'qrcode.react'
import axios from 'axios'
import './wallet.css'

export default function Wallet() {
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [rpcAvailable, setRpcAvailable] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    // Prefer wallet created via the Create/Confirm flow (stored in sessionStorage)
    try {
      const raw = sessionStorage.getItem('wallet')
      if (raw) {
        const w = JSON.parse(raw)
        const acct = (w.accounts && w.accounts[0] && w.accounts[0].address) || ''
        if (acct) {
          setAddress(acct)
          fetchBalance(acct)
          return
        }
      }
    } catch (e) {
      console.error('session wallet read', e)
    }
    const addr = localStorage.getItem('mall_address') || ''
    if (addr) {
      setAddress(addr)
      fetchBalance(addr)
      // poll every 10s
      const id = setInterval(() => fetchBalance(addr), 10000)
      return () => clearInterval(id)
    }
  }, [])

  async function fetchBalance(addr) {
    setLoading(true)
    try {
      const res = await axios.get(`http://localhost:4000/api/mallwallet/balance/${addr}`)
      // show token as MLCNS
      setBalance(res.data.balance)
      setRpcAvailable(true)
      setLastUpdated(new Date().toLocaleString())
    } catch (e) {
      console.error('balance fetch', e)
      setBalance('0')
      setRpcAvailable(false)
      setLastUpdated(new Date().toLocaleString())
      setShowToast(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 6000)
      return () => clearTimeout(t)
    }
  }, [showToast])

  const short = address ? `${address.slice(0,6)}...${address.slice(-6)}` : 'No wallet'

  return (
    <div className="wallet-root">

      <div className="address-bar">
        <span>{short}</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <QRCode value={address || ''} size={42} bgColor="transparent" fgColor="#7dd3c7" />
        </div>
      </div>

      <div className="balance-card">
        <div>
          <div className="wallet-label">Wallet</div>
          <div className="wallet-sub">Mallchain Tokens</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
            <span style={{ color: rpcAvailable ? '#7dd3c7' : '#f97373' }}>{rpcAvailable ? 'RPC: Connected' : 'RPC: Fallback'}</span>
            &nbsp;•&nbsp;Last: {lastUpdated || '—'}
          </div>
        </div>

        {showToast && (
          <div className="rpc-toast" role="status" aria-live="polite">
            RPC unavailable — using fallback (showing 0 balance)
          </div>
        )}

        <div className="balance">
          <div className="balance-title">Balance</div>
          <div className="balance-value">
            {loading ? <span className="spinner" /> : `${balance} MLCNS`}
          </div>
        </div>
      </div>

      <div className="actions-grid">

        <div className="action-card">
          <div className="icon">◇</div>
          <div className="action-title">Create Token</div>
          <div className="action-sub">Your Own Crypto</div>
        </div>

        <div className="action-card">
          <div className="icon">)))</div>
          <div className="action-title">Crypto Payments</div>
          <div className="action-sub">Pay With Crypto</div>
        </div>

        <div className="action-card">
          <div className="icon">➤</div>
          <div className="action-title">Send</div>
          <div className="action-sub">Send MLCNS</div>
        </div>

        <div className="action-card">
          <div className="icon">⌾</div>
          <div className="action-title">Receive</div>
          <div className="action-sub">Show QR / Address</div>
        </div>

        <div className="action-card">
          <div className="icon">💱</div>
          <div className="action-title">Buy</div>
          <div className="action-sub">Buy MLCNS</div>
        </div>

        <div className="action-card">
          <div className="icon">💲</div>
          <div className="action-title">Sell</div>
          <div className="action-sub">Sell MLCNS</div>
        </div>

      </div>

    </div>
  )
}
