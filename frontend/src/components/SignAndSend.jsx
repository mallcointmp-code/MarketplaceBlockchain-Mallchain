import React, {useState} from 'react'
import { signHexMessage } from '../utils/wallet'
import { relaySignedTransfer } from '../utils/tx'

export default function SignAndSend({privHex, pubHex, onSent}){
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSend(){
    if(!privHex) return alert('unlock a wallet first')
    setBusy(true)
    try{
      const payloadHex = Buffer.from(JSON.stringify({creator:pubHex,to,amount})).toString('hex')
      const signature = await signHexMessage(privHex, payloadHex)
      const signed = { creator: pubHex, to, amount: Number(amount), signature, public_key: pubHex }
      const res = await relaySignedTransfer(signed)
      onSent && onSent(res)
      alert('tx relayed')
    }catch(e){
      console.error(e)
      alert('send failed')
    }finally{setBusy(false)}
  }

  return (
    <div style={{border:'1px solid #e5e7eb',padding:12,borderRadius:8,maxWidth:420}}>
      <h3>Send Mallcoin</h3>
      <input placeholder='recipient address' value={to} onChange={e=>setTo(e.target.value)} style={{width:'100%'}} />
      <input placeholder='amount' value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%',marginTop:8}} />
      <div style={{marginTop:8}}>
        <button onClick={handleSend} disabled={busy} className='menu-cta'>Sign & Send</button>
      </div>
    </div>
  )
}
