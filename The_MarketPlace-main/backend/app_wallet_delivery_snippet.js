// Snippet: register wallet & delivery routers in your app.js
const walletRouter = require('./routes/wallet.js');
const deliveryRouter = require('./routes/delivery.js');

// after express app and middlewares are set up:
app.use("/api/wallet", walletRouter);
app.use("/api/delivery", deliveryRouter);

// ensure socket.io instance attached via app.set('io', io) if you use realtime updates

module.exports = { walletRouter, deliveryRouter };