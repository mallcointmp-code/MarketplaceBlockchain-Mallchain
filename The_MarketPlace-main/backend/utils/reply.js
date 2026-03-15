function ok(res, data, meta) {
  return res.json({ success: true, data, meta: meta || null });
}

function fail(res, code, message, status = 400, details) {
  return res.status(status).json({ success: false, error: { code, message, details: details || null } });
}

module.exports = { ok, fail };
module.exports = { ok, fail };