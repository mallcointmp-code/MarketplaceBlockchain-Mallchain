import React, { useState, useEffect } from 'react'
import Login from './pages/Login'

export default function App(){
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('token') || localStorage.getItem('token'))
  useEffect(()=>{ if(token) localStorage.setItem('token', token) }, [token])
  return (
    <div style={{ padding: 20 }}>
      <h1>Marketplace</h1>
      {!token ? <Login onToken={setToken}/> : <div>
        <p>Logged in. Token: <code style={{wordBreak:'break-all'}}>{token}</code></p>
        <p><a href="#" onClick={()=>{ localStorage.removeItem('token'); setToken(null); }}>Logout</a></p>
      </div>}
    </div>
  )
}
