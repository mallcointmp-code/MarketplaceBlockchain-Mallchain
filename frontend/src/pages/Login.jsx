import React, { useState } from 'react'
import axios from 'axios'

export default function Login({ onToken }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

  const login = async (e)=>{
    e.preventDefault()
    try {
      const r = await axios.post(`${base}/api/auth/login`, { email, password })
      onToken(r.data.token)
    } catch (e) { setErr(e.response && e.response.data ? e.response.data.error : e.message) }
  }

  const register = async (e)=>{
    e.preventDefault()
    try {
      const r = await axios.post(`${base}/api/auth/register`, { email, password })
      onToken(r.data.token)
    } catch (e) { setErr(e.response && e.response.data ? e.response.data.error : e.message) }
  }

  return (
    <div>
      <h2>Login / Register</h2>
      <form onSubmit={login} style={{ display:'grid', gap:8, maxWidth:360 }}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" />
        <div style={{ display:'flex', gap:8 }}>
          <button type="submit">Login</button>
          <button onClick={register}>Register</button>
        </div>
      </form>
      <div style={{ marginTop: 12 }}>
        <a href={`http://localhost:4000/api/auth/google`}>Sign in with Google</a>
      </div>
      {err && <div style={{color:'red'}}>{err}</div>}
    </div>
  )
}
