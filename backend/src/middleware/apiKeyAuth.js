// Simple API key auth middleware for protecting sensitive endpoints
module.exports = function apiKeyAuth(req, res, next){
  const key = process.env.ADMIN_API_KEY || null
  if (!key) return res.status(500).json({ error: 'admin api key not configured' })
  const got = req.get('x-api-key') || req.query.api_key || ''
  if (!got || got !== key) return res.status(401).json({ error: 'unauthorized' })
  next()
}
