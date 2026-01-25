import React, {useState} from 'react'
import { decryptPrivateKey } from '../utils/wallet'

export default function UnlockWallet({onUnlock}){
  const [cipher, setCipher] = useState('')
  const [password, setPassword] = useState('')

  function handleUnlock(){
    try{
      const privHex = decryptPrivateKey(cipher, password)
      onUnlock && onUnlock(privHex)
    }catch(e){
      alert('unlock failed')
    }
  }

  return (
    <div style={{border:'1px solid #e5e7eb',padding:12,borderRadius:8,maxWidth:420}}>
      <h3>Unlock Wallet</h3>
      <input placeholder='encrypted private key' value={cipher} onChange={e=>setCipher(e.target.value)} style={{width:'100%'}} />
      <input placeholder='password' value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',marginTop:8}} />
      <div style={{marginTop:8}}>
        <button onClick={handleUnlock} className='menu-cta'>Unlock</button>
      </div>
    </div>
  )
}
