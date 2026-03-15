// Lightweight module to emit product activity events using req.app.get('io')
export default {
  emitView(app, productId, sellerId, extra = {}) {
    try {
      const io = app && app.get && app.get('io');
      if (!io) return;
      if (sellerId) io.to(`user:${sellerId}`).emit('analytics:view', { productId, ...extra });
    } catch (e) { console.error('ws.emitView error', e); }
  }
};
