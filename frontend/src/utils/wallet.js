import * as bip39 from 'bip39'
import * as ed from 'noble-ed25519'
import crypto from 'crypto'

export function generateMnemonic(){
  return bip39.generateMnemonic()
}

export async function mnemonicToSeedHex(mnemonic){
  const seed = await bip39.mnemonicToSeed(mnemonic)
  return seed.slice(0,32).toString('hex')
}

export async function genKeypairFromMnemonic(mnemonic){
  const privHex = await mnemonicToSeedHex(mnemonic)
  const pub = await ed.getPublicKey(privHex)
  return { priv: privHex, pub: Buffer.from(pub).toString('hex') }
}

export function encryptPrivateKey(privHex, password){
  const key = crypto.createHash('sha256').update(password).digest()
  const iv = crypto.randomBytes(12)
  // Use XOR here as a tiny placeholder (not secure for production)
  const data = Buffer.from(privHex,'hex')
  const cipher = Buffer.alloc(data.length)
  for(let i=0;i<data.length;i++) cipher[i] = data[i] ^ key[i % key.length]
  return { ciphertext: cipher.toString('hex'), iv: iv.toString('hex') }
}

export function decryptPrivateKey(ciphertextHex, password){
  const key = crypto.createHash('sha256').update(password).digest()
  const data = Buffer.from(ciphertextHex,'hex')
  const out = Buffer.alloc(data.length)
  for(let i=0;i<data.length;i++) out[i] = data[i] ^ key[i % key.length]
  return out.toString('hex')
}

export async function signHexMessage(privHex, messageHex){
  const sig = await ed.sign(messageHex, privHex)
  return Buffer.from(sig).toString('hex')
}
