import React, {useState} from 'react'
import { generateMnemonic, genKeypairFromMnemonic } from '../utils/wallet'

export default function CreateWallet({onCreate}){
  const [mnemonic, setMnemonic] = useState('')

  function handleCreate(){
    const m = generateMnemonic()
    setMnemonic(m)
  }

  async function handleFinish(){
    const kp = await genKeypairFromMnemonic(mnemonic)
    onCreate && onCreate(kp)
  }

  return (
    <div style={{border:'1px solid #e5e7eb',padding:12,borderRadius:8,maxWidth:420}}>
      <h3>Create Wallet</h3>
      <button onClick={handleCreate} className='menu-cta'>Generate mnemonic</button>
      {mnemonic && (
        <div style={{marginTop:8}}>
          <textarea readOnly value={mnemonic} style={{width:'100%',height:80}} />
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={handleFinish} className='menu-cta'>Use this wallet</button>
          </div>
        </div>
      )}
    </div>
  )
}
