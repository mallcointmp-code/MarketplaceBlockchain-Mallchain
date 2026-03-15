/**
 * Adds parsed targeting hints to req (region, categories, demographics) for ad serving.
 * Example: parse query or user profile.
 */
export default function adTargetingMiddleware(req, res, next) {
  try {
    // basic example: parse a header or query
    const region = req.headers["x-user-region"] || req.query.region || null;
    const categories = req.query.categories ? req.query.categories.split(",") : [];
    const demographics = {};
    if (req.user && req.user.profile) {
      demographics.age = req.user.profile.age;
      demographics.gender = req.user.profile.gender;
      demographics.country = req.user.profile.country;
    }
    req.adTarget = { region, categories, demographics };
    next();
  } catch (err) {
    next();
  }
}
