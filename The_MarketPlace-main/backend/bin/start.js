#!/usr/bin/env node
// backend/bin/start.js (converted to CommonJS)
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const net = require('net');

dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env' });

const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;
const START_WORKERS = process.env.START_WORKERS === 'true';

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForMongo(uri, retries = 30, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      await mongoose.disconnect();
      console.log('Mongo reachable');
      return true;
    } catch (err) {
      process.stdout.write('.');
      await wait(delay);
    }
  }
  return false;
}

function waitForTcp(url, retries = 30, delay = 1000) {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    let attempts = 0;
    const tryConnect = () => {
      attempts++;
      const sock = net.createConnection({ host: hostname, port: Number(port) }, () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', async () => {
        if (attempts >= retries) return resolve(false);
        await wait(delay);
        tryConnect();
      });
    };
    tryConnect();
  });
}

async function main() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in env');
    process.exit(1);
  }

  process.stdout.write('Waiting for Mongo');
  const mongoOk = await waitForMongo(MONGO_URI, 30, 1000);
  if (!mongoOk) {
    console.error('\nMongo not reachable after retries');
    process.exit(1);
  }

  if (REDIS_URL) {
    process.stdout.write(' Waiting for Redis');
    const redisOk = await waitForTcp(REDIS_URL, 30, 1000);
    if (!redisOk) {
      console.error('\nRedis not reachable after retries');
      // Not fatal; continue
    } else {
      console.log(' Redis reachable');
    }
  }

  console.log('\nStarting app server...');
  const server = spawn(process.execPath, ['app.js'], { stdio: 'inherit', cwd: process.cwd(), env: process.env });

  let workerProc = null;
  if (START_WORKERS) {
    console.log('Starting workers...');
    workerProc = spawn(process.execPath, ['workers/assignmentWorker.js'], { stdio: 'inherit', cwd: process.cwd(), env: process.env });
  }

  const shutdown = () => {
    console.log('Shutting down...');
    if (server) server.kill();
    if (workerProc) workerProc.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => { console.error(err); process.exit(1); });
