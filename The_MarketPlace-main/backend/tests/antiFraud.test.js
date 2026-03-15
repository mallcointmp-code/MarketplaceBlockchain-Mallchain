// Simple smoke test for antiFraud util (run with `node backend/tests/antiFraud.test.js`)
const anti = require('../utils/antiFraud');
(async function(){
  const ok1 = await anti.checkIpTaskAllowed(null, 'task1', '1.2.3.4');
  console.log('initial ip allowed?', ok1);
  await anti.markIpTaskCooldown({ get: ()=>null }, 'task1', '1.2.3.4', 1);
  const ok2 = await anti.checkIpTaskAllowed(null, 'task1', '1.2.3.4');
  console.log('after mark ip allowed?', ok2);
  setTimeout(async ()=>{
    const ok3 = await anti.checkIpTaskAllowed(null, 'task1', '1.2.3.4');
    console.log('after ttl ip allowed?', ok3);
  }, 1500);
})();
