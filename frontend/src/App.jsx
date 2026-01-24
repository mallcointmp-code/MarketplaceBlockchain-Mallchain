import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Vault from './pages/Vault'
import Transactions from './pages/Transactions'

export default function App(){
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('token') || localStorage.getItem('token'))
  const [page, setPage] = useState('home')
  useEffect(()=>{ if(token) localStorage.setItem('token', token) }, [token])
  useEffect(()=>{ document.title = page === 'home' ? 'Marketplace — Home' : 'Marketplace' }, [page])
  return (
    <div style={{ padding: 20 }}>
      {/* Header and navigation removed per request */}
      {!token ? <Login onToken={setToken}/> : <div>
        <p>Logged in. Token: <code style={{wordBreak:'break-all'}}>{token}</code></p>
        <p><a href="#" onClick={()=>{ localStorage.removeItem('token'); setToken(null); }}>Logout</a></p>
      </div>}

      <div style={{ marginTop: 20 }}>
        {page === 'home' && <Landing setPage={setPage} token={token} />}
        {page === 'vault' && <Vault token={token} />}
        {page === 'tx' && <Transactions />}
      </div>
    </div>
  )
}
