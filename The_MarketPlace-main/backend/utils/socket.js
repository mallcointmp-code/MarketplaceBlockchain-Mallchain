const { Server } = require('socket.io');

let ioInstance = null;

module.exports = {
  init: (server) => {
    const io = new Server(server, { cors: { origin: process.env.FRONTEND_ORIGIN || '*' } });
    io.on('connection', (socket) => {
      const { token } = socket.handshake.auth || {};
      console.log('socket connected', socket.id);
      socket.on('subscribeTask', ({ taskId }) => { if (taskId) socket.join(`task:${taskId}`); });
      socket.on('joinAgent', ({ agentId }) => { if (agentId) socket.join(`agent:${agentId}`); });
      socket.on('joinAdminDelivery', () => { socket.join('admin:delivery'); });
      socket.on('agentLocation', (d) => {
        if (d.agentId && d.lat && d.lng) {
          io.to(`agent:${d.agentId}`).emit('agent:location', d);
          io.to('admin:delivery').emit('agent:location', d);
        }
      });
      socket.on('disconnect', () => { console.log('socket disconnect', socket.id); });
    });
    ioInstance = io;
    return io;
  },
  get: () => ioInstance
};

module.exports = { io };