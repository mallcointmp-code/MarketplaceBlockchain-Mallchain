
const bcrypt = require('bcrypt');

async function main() {
  const pwd = process.argv[2];
  if (!pwd) {
    console.error('Usage: node gen_admin_hash.js "GODSAVEus1."');
    process.exit(1);
  }
  const saltRounds = 12; // 10-12 
  try {
    const hash = await bcrypt.hash(pwd, saltRounds);
    console.log('ADMIN_PASSWORD_HASH=' + hash);
  } catch (err) {
    console.error('Error generating hash', err);
  }
}
main();
//node gen_admin_hash.js "YourPlaintextPassword"
const bcrypt = require('bcrypt');

async function main() {
  const pwd = process.argv[2];
  if (!pwd) {
    console.error('Usage: node gen_admin_hash.js "GODSAVEus1"');
    process.exit(1);
  }
  const saltRounds = 12; // 10-12 
  try {
    const hash = await bcrypt.hash(pwd, saltRounds);
    console.log('ADMIN_PASSWORD_HASH=' + hash);
  } catch (err) {
    console.error('Error generating hash', err);
  }
}
main();node 
// gen_admin_hash.js