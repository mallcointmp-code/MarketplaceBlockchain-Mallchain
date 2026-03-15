const { rollbackCharge } = require('../services/rollbackService.js');

export async function rollback(req,res){
  try{
    const { adId, amount, reason } = req.body;
    if (!adId || !amount) return res.status(400).json({ error: "adId and amount required" });
    const r = await rollbackCharge(adId, Number(amount), reason || "admin_rollback");
    res.json({ ok: true, result: r });
  } catch(err){ res.status(500).json({ error: err.message }); }
}

module.exports = { r };