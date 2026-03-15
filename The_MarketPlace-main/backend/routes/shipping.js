const express = require("express");
const router = express.Router();
const axios = require("axios");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/create", authMiddleware, async (req, res) => {
  const { address_from, address_to, parcel } = req.body;
  try {
    const response = await axios.post("https://api.goshippo.com/shipments/", {
      address_from,
      address_to,
      parcels: [parcel]
    }, {
      headers: { Authorization: `ShippoToken ${process.env.SHIPPO_TOKEN}` }
    });
    res.json({ success: true, shipment: response.data });
  } catch (err) {
    res.status(500).json({ error: "Shipping creation failed." });
  }
});

module.exports = router;