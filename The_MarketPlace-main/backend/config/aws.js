const config = {
  useS3: process.env.USE_S3 === 'true' || false,
  bucket: process.env.AWS_S3_BUCKET || '',
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
};

export default config;
