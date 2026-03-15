const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  try {
    await axios.post(`https://usX.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: email,
      status: "subscribed"
    }, {
      auth: { username: "anystring", password: process.env.MAILCHIMP_API_KEY }
    });
    res.json({ success: true, message: "Subscribed to newsletter." });
  } catch (err) {
    res.status(500).json({ error: "Subscription failed." });
  }
});

module.exports = router;