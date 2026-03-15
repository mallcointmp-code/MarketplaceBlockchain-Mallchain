Add this snippet into your `backend/app.js` (or integrate into your server startup) to enable Socket.IO with JWT auth.

```js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
// import { createAdapter } from "@socket.io/redis-adapter"; // optional cluster adapter

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });

// attach io to app so controllers can use it
app.set("io", io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("no token"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    if (payload.agentId) socket.join(`agent:${payload.agentId}`);
    socket.join(`user:${payload.userId}`);
    if (payload.role === "admin") socket.join("admin:delivery");
    return next();
  } catch (err) { return next(err); }
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id, socket.user?.userId);

  socket.on("subscribeTask", ({ taskId }) => {
    if (taskId) socket.join(`task:${taskId}`);
  });

  socket.on("agent:location", (payload) => {
    const { agentId, lat, lng, taskId } = payload;
    if (taskId) io.to(`task:${taskId}`).emit("agent:location", payload);
    io.to("admin:delivery").emit("agent:location", payload);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

server.listen(process.env.PORT || 4000, ()=> console.log("backend up"));
```

Add to `backend/app.js` where you initialize your express server. If you already have an http server, integrate `io` into it instead of creating a new server.
