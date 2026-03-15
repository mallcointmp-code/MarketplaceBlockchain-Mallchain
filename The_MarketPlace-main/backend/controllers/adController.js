const AdCampaign = require('../models/AdCampaign');
const Wallet = require('../models/Wallet');
const { recordTx } = require('../services/walletService');
const AuditLog = require('../models/AuditLog');

// admin: create campaign
exports.createCampaign = async (req, res) => {
  try {
    const payload = req.body;
    const campaign = new AdCampaign({ ...payload, createdBy: req.user ? req.user._id : null });
    await campaign.save();
    res.json(campaign);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create campaign' }); }
};

// admin/public: list campaigns
exports.listCampaigns = async (req, res) => {
  try {
    const q = {};
    const campaigns = await AdCampaign.find(q).sort({ createdAt: -1 }).limit(500);
    res.json(campaigns);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to list campaigns' }); }
};

// seller: submit creative (deduct wallet)
exports.submitCreative = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { image, altText, destinationUrl, shopId } = req.body;
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // check slots
    if (campaign.takenSlots >= (campaign.totalSlots || 1)) {
      return res.status(400).json({ error: 'No slots available' });
    }
    // require seller to pay a posting fee (13 bob) before submitting creative
    const POSTING_FEE = 13;
    const wallet = await Wallet.findOne({ ownerId: req.user._id });
    if (!wallet || (wallet.mallmoney || 0) < POSTING_FEE) return res.status(400).json({ error: 'Insufficient Mallmoney to pay posting fee' });

    wallet.mallmoney -= POSTING_FEE;
    await wallet.save();

    await recordTx(wallet._id, {
      type: 'ad_post_fee',
      amount: POSTING_FEE,
      currency: 'KSH',
      counterparty: 'ad_campaign_posting_fee',
      meta: { campaignId }
    });

    // audit log for posting fee
    try { await AuditLog.create({ user: req.user && req.user._id, action: 'ad.post_fee', details: { campaignId, amount: POSTING_FEE }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }

    const creative = {
      sellerId: req.user._id,
      image, altText, destinationUrl, shopId,
      shopName: req.user.shopName || null,
      uploadedAt: new Date(),
      status: 'pending'
    };
    campaign.creatives.push(creative);
    campaign.takenSlots = Math.min(campaign.totalSlots, (campaign.takenSlots || 0) + 1);
    campaign.startsAt = campaign.startsAt || new Date();
    campaign.endsAt = new Date(Date.now() + (campaign.durationDays || 7) * 24 * 3600 * 1000);
    await campaign.save();

    res.json({ ok: true, campaign, creative });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Submit failed' }); }
};

// admin: approve creative
exports.approveCreative = async (req, res) => {
  try {
    const { campaignId, creativeIndex } = req.body;
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const creative = campaign.creatives[creativeIndex];
    if (!creative) return res.status(404).json({ error: 'Creative not found' });
    creative.status = 'approved';
    campaign.approvals.approved = true;
    campaign.approvals.approvedAt = new Date();
    campaign.approvals.approvedBy = req.user._id;
    await campaign.save();
    // audit: admin approved creative
    try { await AuditLog.create({ user: req.user && req.user._id, action: 'ad.approve', details: { campaignId, creativeIndex }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
    res.json({ ok: true, campaign, creative });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Approve failed' }); }
};

// public: get active creatives for slot
exports.getActiveForSlot = async (req, res) => {
  try {
    const { slotKey } = req.params;
    const now = new Date();
    const campaigns = await AdCampaign.find({ slotKey, status: { $in: ['approved','active'] }, 'creatives.status': 'approved', startsAt: { $lte: now }, endsAt: { $gte: now } });
    const creatives = [];
    for (const c of campaigns) {
      for (const cr of c.creatives) {
        if (cr.status === 'approved') {
          const obj = cr.toObject ? cr.toObject() : JSON.parse(JSON.stringify(cr));
          obj.campaignId = c._id;
          obj.pricePerSlot = c.pricePerSlot;
          creatives.push(obj);
        }
      }
    }
    res.json(creatives);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch ads' }); }
};

// record impression/click
exports.recordAdEvent = async (req, res) => {
  try {
    const { campaignId, type } = req.body;
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    // handle impression with optional budget deduction per impression
    if (type === 'impression') {
      const bid = Number(campaign.bidPerImpression || 0);
      if (bid > 0) {
        // try atomic update only when budget >= bid to avoid negative budgets
        const updated = await AdCampaign.findOneAndUpdate(
          { _id: campaignId, budget: { $gte: bid } },
          { $inc: { impressions: 1, budget: -bid } },
          { new: true }
        );
        if (updated) {
          try { await AuditLog.create({ user: null, action: 'ad.impression.charge', details: { campaignId, bid, newBudget: updated.budget }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
        } else {
          // budget insufficient: still count impression but mark completed
          await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 }, $set: { status: 'completed', budget: 0 } });
          try { await AuditLog.create({ user: null, action: 'ad.impression.no_budget', details: { campaignId }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
        }
      } else {
        await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 } });
      }
    }
    if (type === 'click') {
      await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } });
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

// wrapper: track impression by campaign id (route param)
exports.trackImpressionById = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const bid = Number(campaign.bidPerImpression || 0);
    if (bid > 0) {
      // atomically decrement budget only if budget >= bid
      const updated = await AdCampaign.findOneAndUpdate(
        { _id: campaignId, budget: { $gte: bid } },
        { $inc: { impressions: 1, budget: -bid } },
        { new: true }
      );
      if (updated) {
        try { await AuditLog.create({ user: null, action: 'ad.impression.charge', details: { campaignId, bid, newBudget: updated.budget }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
      } else {
        // budget insufficient: increment impressions and mark completed
        await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 }, $set: { status: 'completed', budget: 0 } });
        try { await AuditLog.create({ user: null, action: 'ad.impression.no_budget', details: { campaignId }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
      }
    } else {
      await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 } });
    }
    res.json({ ok: true });
  } catch (err) { console.error('trackImpressionById', err); res.status(500).json({ error: 'failed' }); }
};

// wrapper: track click by campaign id
exports.trackClickById = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updated = await AdCampaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Campaign not found' });
    try { await AuditLog.create({ user: null, action: 'ad.click.recorded', details: { campaignId, clicks: updated.clicks }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
    res.json({ ok: true });
  } catch (err) { console.error('trackClickById', err); res.status(500).json({ error: 'failed' }); }
};

// admin: reject a creative (marks creative rejected; refund can be processed via refund endpoint)
exports.rejectCreative = async (req, res) => {
  try {
    const { campaignId, creativeIndex, reason } = req.body;
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const creative = campaign.creatives[creativeIndex];
    if (!creative) return res.status(404).json({ error: 'Creative not found' });
    creative.status = 'rejected';
    creative.reason = reason || '';
    campaign.updatedAt = new Date();
    await campaign.save();
    // notify seller
    const io = req.app.get('io');
    if (io) io.to(`user:${creative.sellerId}`).emit('ad:status', { campaignId, creativeIndex, status: 'rejected' });
    try { await AuditLog.create({ user: req.user && req.user._id, action: 'ad.reject', details: { campaignId, creativeIndex, reason }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }
    res.json({ ok: true, campaign, creative });
  } catch (err) { console.error('rejectCreative', err); res.status(500).json({ error: 'reject failed' }); }
};

// refund a seller for a specific creative
exports.refundCreative = async (req, res) => {
  try {
    const { campaignId, creativeIndex, force } = req.body;
    const userId = req.user._id;
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const creative = campaign.creatives[creativeIndex];
    if (!creative) return res.status(404).json({ error: 'Creative not found' });

    const isSeller = creative.sellerId && creative.sellerId.toString() === userId.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isSeller && !isAdmin) return res.status(403).json({ error: 'Not authorized to refund' });

    if (!force && creative.status !== 'rejected') {
      return res.status(400).json({ error: 'Refund allowed only for rejected creatives (unless admin forces refund)' });
    }

    const amount = campaign.pricePerSlot || 0;
    if (amount <= 0) return res.status(400).json({ error: 'No refundable amount' });

    let sellerWallet = await Wallet.findOne({ ownerId: creative.sellerId });
    if (!sellerWallet) {
      sellerWallet = new Wallet({ ownerId: creative.sellerId, mallmoney: 0 });
      await sellerWallet.save();
    }
    sellerWallet.mallmoney += amount;
    await sellerWallet.save();

    await recordTx(sellerWallet._id, {
      type: 'ad_refund',
      amount,
      currency: 'KSH',
      counterparty: `refund_campaign_${campaignId}`,
      meta: { campaignId, creativeIndex }
    });

    creative.status = 'refunded';
    campaign.takenSlots = Math.max(0, (campaign.takenSlots || 1) - 1);
    await campaign.save();
    try { await AuditLog.create({ user: req.user && req.user._id, action: 'ad.refund', details: { campaignId, creativeIndex, amount }, ip: req.ip }); } catch (e) { console.error('audit log failed', e); }

    res.json({ ok: true, refundedAmount: amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Refund failed' });
  }
};

// campaign analytics (admin)
exports.campaignAnalytics = async (req, res) => {
  try {
    const { slotKey } = req.query;
    const q = slotKey ? { slotKey } : {};
    const campaigns = await AdCampaign.find(q).lean();

    const aggregated = campaigns.map(c => {
      const revenue = (c.takenSlots || 0) * (c.pricePerSlot || 0);
      const ctr = c.impressions ? (c.clicks / c.impressions) : 0;
      return {
        campaignId: c._id,
        title: c.title,
        slotKey: c.slotKey,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        ctr: Number(ctr.toFixed(4)),
        revenue,
        totalSlots: c.totalSlots,
        takenSlots: c.takenSlots || 0
      };
    });

    const totals = aggregated.reduce((acc, cur) => {
      acc.impressions += cur.impressions;
      acc.clicks += cur.clicks;
      acc.revenue += cur.revenue;
      acc.totalSlots += cur.totalSlots;
      acc.takenSlots += cur.takenSlots;
      return acc;
    }, { impressions: 0, clicks: 0, revenue: 0, totalSlots: 0, takenSlots: 0 });

    const platformCtr = totals.impressions ? Number((totals.clicks / totals.impressions).toFixed(4)) : 0;
    res.json({ campaigns: aggregated, totals: { ...totals, ctr: platformCtr } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analytics failed' });
  }
};

// returns creatives owned by authenticated seller
exports.myCreatives = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const campaigns = await AdCampaign.find({ 'creatives.sellerId': sellerId }).lean();
    const result = [];
    campaigns.forEach(campaign => {
      (campaign.creatives || []).forEach((creative, index) => {
        if (creative.sellerId && creative.sellerId.toString() === sellerId.toString()) {
          result.push({
            campaignId: campaign._id,
            campaignTitle: campaign.title,
            slotKey: campaign.slotKey,
            pricePerSlot: campaign.pricePerSlot,
            totalSlots: campaign.totalSlots,
            takenSlots: campaign.takenSlots,
            creativeIndex: index,
            ...creative
          });
        }
      });
    });

    res.json({ creatives: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load your creatives' });
  }
};

// admin: return pending creatives flattened for approval queue
exports.adminPendingCreatives = async (req, res) => {
  try {
    const q = { 'creatives.status': 'pending' };
    // optionally filter by slotKey/status
    const campaigns = await AdCampaign.find(q).lean();
    const pending = [];
    campaigns.forEach(c => {
      (c.creatives || []).forEach((cr, idx) => {
        if (cr && cr.status === 'pending') {
          pending.push({ campaignId: c._id, title: c.title, slotKey: c.slotKey || c.slot, campaign: c, creative: cr, creativeIndex: idx });
        }
      });
    });
    res.json({ ok: true, pending });
  } catch (err) { console.error('adminPendingCreatives', err); res.status(500).json({ error: 'failed' }); }
};

// CSV export for analytics (admin) - streaming implementation
const { Transform: StreamTransform, pipeline } = require('stream');
const { Transform: Json2csvTransform } = require('json2csv');
exports.exportAnalyticsCSV = async (req, res) => {
  try {
    const { slotKey } = req.query;
    const filter = slotKey ? { slotKey } : {};

    // Set headers for CSV download and encoding
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    // Suggest filename and force download in browser
    res.setHeader('Content-Disposition', 'attachment; filename="campaign_analytics.csv"');
    // Write UTF-8 BOM so Excel recognizes UTF-8 CSVs correctly
    res.write('\uFEFF');

    // Create a cursor to stream campaign documents
    const cursor = AdCampaign.find(filter).cursor();

    // Map Mongo documents to flat CSV rows
    const mapToRow = new StreamTransform({ objectMode: true, transform(doc, enc, cb) {
      try {
        const c = doc && doc.toObject ? doc.toObject() : doc;
        const revenue = (c.takenSlots || 0) * (c.pricePerSlot || 0);
        const ctr = c.impressions ? (c.clicks / c.impressions) : 0;
        const row = {
          CampaignID: c._id,
          Title: c.title,
          Slot: c.slotKey,
          Impressions: c.impressions || 0,
          Clicks: c.clicks || 0,
          CTR: ctr ? ctr.toFixed(4) : '0.0000',
          Revenue: revenue,
          Start: c.startsAt ? new Date(c.startsAt).toISOString() : '',
          End: c.endsAt ? new Date(c.endsAt).toISOString() : ''
        };
        cb(null, row);
      } catch (e) { cb(e); }
    }});

    // json2csv transform to convert objects to CSV rows
    const json2csv = new Json2csvTransform({ fields: ['CampaignID','Title','Slot','Impressions','Clicks','CTR','Revenue','Start','End'], header: true }, { objectMode: true });

    // Pipeline: cursor -> mapToRow -> json2csv -> response
    pipeline(cursor, mapToRow, json2csv, res, (err) => {
      if (err) {
        console.error('CSV export pipeline error', err);
        // If headers not sent fully, send error status
        try { if (!res.headersSent) res.status(500).json({ error: 'CSV export failed' }); }
        catch (e) { /* ignore */ }
      }
    });

  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'CSV export failed' });
  }
};
