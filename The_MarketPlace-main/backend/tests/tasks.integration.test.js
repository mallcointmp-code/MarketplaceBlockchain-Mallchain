const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const TaskCampaign = require('../models/TaskCampaign');
const TaskParticipation = require('../models/TaskParticipation');
const Wallet = require('../models/Wallet');
const tasksCtrl = require('../controllers/tasksController');

(async function(){
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to in-memory mongo for tasks integration test');

  // create user wallet and publisher wallet
  const pubId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const pubWallet = new Wallet({ ownerId: pubId, mallpoints: 100 });
  await pubWallet.save();

  // simulate express req/res for createTask
  const req = { body: { title: 'Test', platform: 'tiktok', action: 'view', rewardPerAction: 1, budget: 10 }, user: { _id: pubId } };
  const res = { json: (x)=>{ console.log('createTask res', x); }, status: (s)=>({ json: (x)=>{ console.log('status', s, x); } }) };
  await tasksCtrl.createTask(req, res);

  // cleanup
  await mongoose.disconnect();
  await mongod.stop();
  console.log('Integration test finished');
})();
