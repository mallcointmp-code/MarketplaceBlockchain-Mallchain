const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing')
const fs = require('fs')

(async ()=>{
  const m = fs.readFileSync('/tmp/test_mnemonic.txt','utf8').trim()
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(m, { prefix: 'mall' })
  const accounts = await wallet.getAccounts()
  console.log(accounts[0].address)
})().catch(e=>{ console.error(e); process.exit(1) })
