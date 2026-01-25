import React from 'react'
import MallcoinDonut from '../components/MallcoinDonut'
import './landing.css'
import CreateWallet from '../components/CreateWallet'
import UnlockWallet from '../components/UnlockWallet'
import SignAndSend from '../components/SignAndSend'
import { useState } from 'react'

export default function Mallcoin(){
  const [wallet, setWallet] = useState(null)
  const [privHex, setPrivHex] = useState(null)

  return (
    <div style={{padding:24}}>
      <h2>Mallcoin</h2>
      <p style={{color:'#6b7280'}}>Live Mallcoin breakdown (monthly / this week / today)</p>
      <div style={{display:'flex',gap:24,marginTop:18,alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <MallcoinDonut />
        </div>
        <div style={{width:420,display:'flex',flexDirection:'column',gap:12}}>
          <CreateWallet onCreate={(kp)=>{ setWallet(kp); setPrivHex(kp.priv) }} />
          <UnlockWallet onUnlock={(p)=>setPrivHex(p)} />
          <SignAndSend privHex={privHex} pubHex={wallet?.pub} onSent={(r)=>console.log('sent',r)} />
        </div>
      </div>
    </div>
  )
}
