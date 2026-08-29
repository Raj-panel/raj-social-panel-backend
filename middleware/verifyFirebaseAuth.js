// middleware/verifyFirebaseAuth.js
//
// Verifies the Firebase ID token sent from the frontend, and attaches the
// TRUSTED Mongo user to req.user / req.userId. Nothing after this point
// should ever trust a userId coming from req.body — only from here.
//
// One-time setup:
//   npm install firebase-admin
//   Firebase Console → Project Settings → Service Accounts → Generate new
//   private key. Then set these in your .env (and in Vercel env vars):
//     FIREBASE_PROJECT_ID
//     FIREBASE_CLIENT_EMAIL
//     FIREBASE_PRIVATE_KEY     (keep the \n as literal \n — see below)
//
// Frontend (auth-handler.js) must send the ID token on every protected call:
//   const token = await firebase.auth().currentUser.getIdToken();
//   fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${token}`
//     },
//     body: JSON.stringify({ ... })
//   });

const admin = require('firebase-admin');
const User = require('../models/User');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

async function verifyFirebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing auth token' });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    // Find or auto-create the Mongo user doc for this Firebase account.
    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email || `${decoded.uid}@no-email.local`,
        username: decoded.name || (decoded.email ? decoded.email.split('@')[0] : decoded.uid),
        balance: 0,
      });
    }

    req.user = user;       // full Mongo user document
    req.userId = user._id; // trusted ObjectId — use this for Transaction.user

    next();
  } catch (err) {
    console.error('Firebase auth verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = { verifyFirebaseAuth };