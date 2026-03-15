const { reserveEscrow } = require('../services/adsService.js');

export async function reserve(req,res){
  try {
    const { adId, amount } = req.body;
    await reserveEscrow(adId, Number(amount));
    res.json({ ok: true });
  } catch(err){ res.status(400).json({ error: err.message }); }
}
