function success(res, payload = {}, code = 200) {
  return res.status(code).json({ success: true, ...payload });
}

function error(res, message = 'Server error', code = 500) {
  return res.status(code).json({ success: false, message });
}

module.exports = { success, error };

module.exports = { success, error };