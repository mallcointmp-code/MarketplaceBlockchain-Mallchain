import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import Vault from './pages/Vault'
import Transactions from './pages/Transactions'

export default function App(){
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('token') || localStorage.getItem('token'))
  const [page, setPage] = useState('home')
  useEffect(()=>{ if(token) localStorage.setItem('token', token) }, [token])
  return (
    <div style={{ padding: 20 }}>
      <h1>Marketplace</h1>
      <nav style={{ marginBottom: 12 }}>
        <button onClick={()=>setPage('home')}>Home</button>
        <button onClick={()=>setPage('vault')}>Vaults</button>
        <button onClick={()=>setPage('tx')}>Transactions</button>
      </nav>
      {!token ? <Login onToken={setToken}/> : <div>
        <p>Logged in. Token: <code style={{wordBreak:'break-all'}}>{token}</code></p>
        <p><a href="#" onClick={()=>{ localStorage.removeItem('token'); setToken(null); }}>Logout</a></p>
      </div>}

      <div style={{ marginTop: 20 }}>
        {page === 'home' && <div>Welcome — choose a page.</div>}
        {page === 'vault' && <Vault token={token} />}
        {page === 'tx' && <Transactions />}
      </div>
    </div>
  )
}
