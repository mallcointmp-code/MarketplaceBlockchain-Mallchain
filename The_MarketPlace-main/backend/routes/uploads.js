const express = require("express");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");

// Configure S3 client using env vars
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

// POST /api/uploads/presigned-urls
// body: { filenames: ["a.jpg","b.png"] }
router.post("/presigned-urls", authMiddleware, async (req, res) => {
  const { filenames } = req.body;
  if (!filenames || !Array.isArray(filenames)) return res.status(400).json({ error: "Bad request" });

  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const urls = await Promise.all(
      filenames.map(async (name) => {
        const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: "application/octet-stream",
          ACL: "public-read",
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return {
          fileName: name,
          key,
          url,
          method: "PUT",
          publicUrl: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        };
      })
    );

    res.json({ urls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create presigned urls" });
  }
});

module.exports = router;
