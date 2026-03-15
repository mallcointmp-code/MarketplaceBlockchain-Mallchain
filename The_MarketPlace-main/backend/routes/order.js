const express = require('express');
const ctrl = require("../controllers/orderController.js");
const router = express.Router();

router.get("/", ctrl.listOrders);
router.post("/", ctrl.createOrder);
router.get("/:id", ctrl.getOrder);
router.put("/:id", ctrl.updateOrder);

module.exports = router;