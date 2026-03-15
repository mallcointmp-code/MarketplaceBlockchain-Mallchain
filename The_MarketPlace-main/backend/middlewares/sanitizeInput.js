// middleware to sanitize incoming string inputs in req.body
export default function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        // remove basic angle-bracket characters to reduce XSS risk
        req.body[key] = req.body[key].replace(/[<>]/g, "");
      }
    }
  }
  next();
}