const mongoose = require('mongoose');
const DeliveryHistory = require('../models/DeliveryHistory');
const DeliveryTask = require('../models/DeliveryTask');
const { fetchRoutePolyline } = require('../services/directionsService');
const { Parser } = require('json2csv');

// Monthly performance (last 12 months) for agent or global
exports.monthlyPerformance = async (req, res) => {
  try {
    const agentId = req.params.agentId || null;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const match = { createdAt: { $gte: start } };
    if (agentId) match.agentId = mongoose.Types.ObjectId(agentId);

    const agg = await DeliveryHistory.aggregate([
      { $match: match },
      { $project: {
          monthYear: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          amountPaid: "$amountPaid",
          agentPayout: "$agentPayout",
          createdAt: 1
      }},
      { $group: {
          _id: "$monthYear",
          deliveries: { $sum: 1 },
          totalPaid: { $sum: "$amountPaid" },
          totalPayout: { $sum: "$agentPayout" }
      }},
      { $sort: { "_id": 1 } }
    ]);
    res.json({ data: agg });
  } catch (err) {
    console.error("monthlyPerformance err", err);
    res.status(500).json({ error: "monthly performance failed" });
  }
};

// Yearly income breakdown by month
exports.yearlyIncome = async (req, res) => {
  try {
    const agentId = req.params.agentId || null;
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1), end = new Date(year + 1, 0, 1);
    const match = { createdAt: { $gte: start, $lt: end } };
    if (agentId) match.agentId = mongoose.Types.ObjectId(agentId);

    const agg = await DeliveryHistory.aggregate([
      { $match: match },
      { $project: {
          month: { $month: "$createdAt" },
          agentPayout: "$agentPayout",
          amountPaid: "$amountPaid"
      }},
      { $group: { _id: "$month", total: { $sum: "$agentPayout" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ data: agg, total: agg.reduce((s, a) => s + a.total, 0) });
  } catch (err) {
    console.error("yearlyIncome err", err);
    res.status(500).json({ error: "yearly income failed" });
  }
};

// KPI summary (agent-specific optional)
exports.deliveryKPI = async (req, res) => {
  try {
    const agentId = req.query.agentId || null;
    const match = {};
    if (agentId) match.agentId = mongoose.Types.ObjectId(agentId);

    const totalDeliveries = await DeliveryHistory.countDocuments(match);
    const totalPaidAgg = await DeliveryHistory.aggregate([{ $match: match }, { $group: { _id: null, s: { $sum: "$amountPaid" } } }]);
    const totalPaid = totalPaidAgg[0]?.s || 0;

    const avgRatingAgg = await DeliveryTask.aggregate([
      { $match: agentId ? { "assignedAgentId": mongoose.Types.ObjectId(agentId) } : {} },
      { $group: { _id: null, avgBuyerRating: { $avg: "$rating.buyerRating" }, avgSellerRating: { $avg: "$rating.sellerRating" } } }
    ]);

    const rejected = await DeliveryTask.countDocuments({ ...(agentId ? { assignedAgentId: mongoose.Types.ObjectId(agentId) } : {}), status: { $in: ["failed","cancelled"] } });

    res.json({
      totalDeliveries,
      totalPaid,
      avgBuyerRating: avgRatingAgg[0]?.avgBuyerRating || 0,
      avgSellerRating: avgRatingAgg[0]?.avgSellerRating || 0,
      rejected
    });
  } catch (err) {
    console.error("deliveryKPI err", err);
    res.status(500).json({ error: "kpi error" });
  }
};

// list paginated history for an agent
exports.listAgentHistory = async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filter = { agentId: mongoose.Types.ObjectId(agentId) };
    if (req.query.status) filter.status = req.query.status;
    const items = await DeliveryHistory.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean();
    const total = await DeliveryHistory.countDocuments(filter);
    res.json({ items, total });
  } catch (err) {
    console.error("listAgentHistory err", err);
    res.status(500).json({ error: "list history failed" });
  }
};

// export CSV
exports.exportHistoryCSV = async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const rows = await DeliveryHistory.find({ agentId: mongoose.Types.ObjectId(agentId) }).sort({ createdAt: -1 }).lean();
    const fields = ["createdAt","orderId","taskId","amountPaid","agentPayout","platformFee","status","durationSec","expectedDurationSec","reasonTags"];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows.map(r => ({
      createdAt: r.createdAt,
      orderId: String(r.orderId || ""),
      taskId: String(r.taskId || ""),
      amountPaid: r.amountPaid || 0,
      agentPayout: r.agentPayout || 0,
      platformFee: r.platformFee || 0,
      status: r.status || "",
      durationSec: r.durationSec || 0,
      expectedDurationSec: r.expectedDurationSec || 0,
      reasonTags: (r.reasonTags || []).join("|")
    })));
    res.header('Content-Type', 'text/csv');
    res.attachment(`delivery_history_${agentId}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("exportHistoryCSV err", err);
    res.status(500).json({ error: "export failed" });
  }
};

// task detail (includes task + history) -- ensures route polyline available lazily
exports.getTaskDetail = async (req, res) => {
  try {
    const { taskId } = req.params;
    let task = await DeliveryTask.findById(taskId).lean();
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // if route polyline missing but we have coords, compute lazily and persist
    const hasCoords = task.pickupLocation && task.pickupLocation.lat && task.pickupLocation.lng && task.dropoffLocation && task.dropoffLocation.lat && task.dropoffLocation.lng;
    const needsRoute = (!task.routePolylineEncoded || !task.routePolylineCoords || task.routePolylineCoords.length === 0) && hasCoords;
    if (needsRoute) {
      try {
        const routeInfo = await fetchRoutePolyline(task.pickupLocation.lat, task.pickupLocation.lng, task.dropoffLocation.lat, task.dropoffLocation.lng);
        if (routeInfo) {
          await DeliveryTask.findByIdAndUpdate(taskId, {
            routePolylineEncoded: routeInfo.encoded,
            routePolylineCoords: routeInfo.decoded,
            routeDistanceMeters: routeInfo.distanceMeters,
            routeDurationSec: routeInfo.durationSec
          }).catch(() => {});
          // refresh task with new route info
          task.routePolylineEncoded = routeInfo.encoded;
          task.routePolylineCoords = routeInfo.decoded;
          task.routeDistanceMeters = routeInfo.distanceMeters;
          task.routeDurationSec = routeInfo.durationSec;
        }
      } catch (e) {
        console.warn('lazy route compute failed', e && (e.message || e));
      }
    }

    const history = await DeliveryHistory.findOne({ taskId: mongoose.Types.ObjectId(taskId) }).lean();
    res.json({ task, history });
  } catch (err) {
    console.error('getTaskDetail err', err);
    res.status(500).json({ error: 'task detail failed' });
  }
};
