const express = require('express');
import * as ctrl from "../controllers/productController.js";
const router = express.Router();

router.get("/", ctrl.listProducts);
router.post("/", ctrl.createProduct);
router.get("/:id", ctrl.getProduct);
router.put("/:id", ctrl.updateProduct);
router.delete("/:id", ctrl.deleteProduct);

module.exports = router;

module.exports = { express, router };