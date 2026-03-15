// backend/middlewares/adTargeting.js
// Simple middleware to prepare ad targeting info from user context and query
export default function adTargeting(req, res, next) {
  req.adTarget = {
    region: req.user?.region || 'KE',
    interests: req.user?.interests || [],
    age: req.user?.age || null,
    category: req.query?.category || null
  };
  next();
}
