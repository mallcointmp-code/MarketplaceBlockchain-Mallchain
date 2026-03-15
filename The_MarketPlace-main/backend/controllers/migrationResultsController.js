const MigrationResult = require("../models/MigrationResult.js");
const DeliveryTask = require("../models/DeliveryTask.js");
const directionsService = require("../services/directionsService.js");

const listMigrationResults = async (req, res) => {
  try {
    const { taskId, success } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (success === "true") filter.success = true;
    if (success === "false") filter.success = false;

    const docs = await MigrationResult.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean();
    const total = await MigrationResult.countDocuments(filter);
    res.json({ data: docs, meta: { page, limit, total } });
  } catch (err) {
    console.error("listMigrationResults err", err);
    res.status(500).json({ error: "list failed" });
  }
};

const retryTaskMigration = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: "taskId required" });
    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const p = task.pickupLocation || {};
    const d = task.dropoffLocation || {};
    if (!p.lat || !p.lng || !d.lat || !d.lng) {
      return res.status(400).json({ error: "Task missing coordinates" });
    }

    const routeInfo = await directionsService.fetchRoutePolylineWithCache(p.lat, p.lng, d.lat, d.lng);
    if (!routeInfo || !routeInfo.encoded) {
      const mr = new MigrationResult({
        taskId: task._id,
        attempt: 1,
        success: false,
        reason: "no_route_retry",
        notes: JSON.stringify(routeInfo || {}),
        origin: { lat: p.lat, lng: p.lng },
        destination: { lat: d.lat, lng: d.lng }
      });
      await mr.save();
      return res.status(500).json({ ok: false, reason: "no_route" });
    }

    const update = {
      routePolylineEncoded: routeInfo.encoded,
      routePolylineCoords: routeInfo.decoded || [],
      routeDistanceMeters: routeInfo.distanceMeters || null,
      routeDurationSec: routeInfo.durationSec || null
    };
    if (!task.expectedDurationSec && routeInfo.durationSec) update.expectedDurationSec = routeInfo.durationSec;
    await DeliveryTask.findByIdAndUpdate(task._id, update);

    const mr2 = new MigrationResult({
      taskId: task._id,
      attempt: 1,
      success: true,
      reason: "manual_retry_success",
      notes: `coords:${(routeInfo.decoded||[]).length}`,
      origin: { lat: p.lat, lng: p.lng },
      destination: { lat: d.lat, lng: d.lng },
      routeEncoded: routeInfo.encoded,
      routeCoordsLength: (routeInfo.decoded||[]).length,
      durationSec: routeInfo.durationSec,
      distanceMeters: routeInfo.distanceMeters
    });
    await mr2.save();

    res.json({ ok: true, updated: true, routeInfo });
  } catch (err) {
    console.error("retryTaskMigration err", err);
    res.status(500).json({ error: "retry failed", details: err?.message || err });
  }
};

module.exports = { listMigrationResults, retryTaskMigration };
