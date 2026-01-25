import axios from 'axios'

const CHAIN_REST = process.env.CHAIN_REST || 'http://127.0.0.1:1317'

export async function relaySignedTransfer(signed){
  // signed: { creator, to, amount, signature, public_key }
  const url = `${CHAIN_REST}/tmp/marketplace/mlcoin/v1/transfer` // REST route for MsgTransferMallcoin (gw)
  try{
    const res = await axios.post(url, signed)
    return res.data
  }catch(e){
    throw e
  }
}
