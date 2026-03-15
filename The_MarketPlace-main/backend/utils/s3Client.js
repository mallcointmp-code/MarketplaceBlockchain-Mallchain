const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const awsConfig = require('../config/aws.js');

let client = null;
function getClient() {
  if (client) return client;
  client = new S3Client({
    region: awsConfig.region,
    credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey
    } : undefined
  });
  return client;
}

export async function uploadFile({ localFilePath, key, contentType = 'application/octet-stream', acl = 'public-read' }) {
  if (!awsConfig.useS3) throw new Error('S3 disabled');
  if (!awsConfig.bucket) throw new Error('S3 bucket not configured');

  const client = getClient();
  const body = fs.createReadStream(localFilePath);
  const params = {
    Bucket: awsConfig.bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  };

  try {
    await client.send(new PutObjectCommand(params));
    const url = `https://${awsConfig.bucket}.s3.${awsConfig.region}.amazonaws.com/${encodeURIComponent(key)}`;
    return { url, key };
  } catch (err) {
    throw err;
  }
}

module.exports = { uploadFile };

module.exports = { fs, path, awsConfig, client, body, params, url };