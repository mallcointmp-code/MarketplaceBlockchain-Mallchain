const { getTreasuryMnemonic } = require('../utils/keyManager');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { SigningStargateClient } = require('@cosmjs/stargate');
const RPC = process.env.RPC || process.env.CHAIN_RPC || 'http://127.0.0.1:26657';
const PREFIX = process.env.PREFIX || 'marketplace';

exports.createValidator = async (req, res) => {
  try {
    const { delegator, pubkey, amount, denom, moniker, website, details } = req.body;
    if (!delegator || !pubkey || !amount || !denom || !moniker) return res.status(400).json({ error: 'Missing required fields' });
    const mnemonic = await getTreasuryMnemonic();
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: PREFIX });
    const [account] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(RPC, wallet);
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator',
      value: {
        description: { moniker, identity: '', website, details },
        commission: { rate: '0.10', max_rate: '0.20', max_change_rate: '0.01' },
        min_self_delegation: String(amount),
        delegator_address: delegator,
        validator_address: account.address,
        pubkey: { typeUrl: '/cosmos.crypto.ed25519.PubKey', value: Buffer.from(pubkey, 'base64') },
        value: { amount: String(amount), denom }
      }
    };
    const fee = { amount: [{ denom, amount: '5000' }], gas: '300000' };
    const result = await client.signAndBroadcast(account.address, [msg], fee);
    res.json({ ok: true, tx: result });
  } catch (e) {
    res.status(500).json({ error: 'create_validator_failed', details: String(e) });
  }
};
