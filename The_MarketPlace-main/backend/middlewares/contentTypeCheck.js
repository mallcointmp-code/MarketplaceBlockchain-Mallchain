export default function contentTypeCheck(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (["POST", "PUT", "PATCH"].includes(req.method) && contentType.indexOf('application/json') !== 0) {
    return res.status(415).json({ success: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' } });
  }
  next();
}