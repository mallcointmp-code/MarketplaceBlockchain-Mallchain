const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");

const MNEMONIC = process.env.MNEMONIC || "concert load couple harbor equip island argue slogan kitten food gate coral";
const PREFIX = process.env.PREFIX || "mall";

async function main() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: PREFIX });
  const [first] = await wallet.getAccounts();
  console.log("ADDRESS=", first.address);
  console.log("PUBKEY=", first.pubkey && Buffer.from(first.pubkey).toString('base64'));
}

main().catch((e) => { console.error(e); process.exit(1); });
