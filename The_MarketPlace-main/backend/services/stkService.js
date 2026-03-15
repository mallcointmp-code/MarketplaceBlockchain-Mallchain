// backend/services/stkService.js
const axios = require('axios');
// Simulation removed: callers must implement real STK integration.
export async function initiateStkPush() {
  throw new Error("STK push integration not implemented. Implement Safaricom Daraja STK flow.");
}

export async function checkStkStatus() {
  throw new Error("STK status check not implemented. Implement provider query.");
}

module.exports = { axios };