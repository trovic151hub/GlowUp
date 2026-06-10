const e = (key) => (process.env[key] || '').trim();

module.exports = (req, res) => {
  const config = {
    firebase: {
      apiKey: e('FIREBASE_API_KEY'),
      authDomain: e('FIREBASE_AUTH_DOMAIN'),
      projectId: e('FIREBASE_PROJECT_ID'),
      storageBucket: e('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: e('FIREBASE_MESSAGING_SENDER_ID'),
      appId: e('FIREBASE_APP_ID')
    },
    paystackKey: e('PAYSTACK_PUBLIC_KEY'),
    cloudinary: {
      cloudName: e('CLOUDINARY_CLOUD_NAME'),
      uploadPreset: e('CLOUDINARY_UPLOAD_PRESET')
    }
  };
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`window.CONFIG = ${JSON.stringify(config)};`);
};
