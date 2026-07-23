import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let _db: Firestore | null = null;

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'medicalkorea-2205a';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@medicalkorea-2205a.iam.gserviceaccount.com';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }

  // Try loading from local file
  try {
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(process.cwd(), 'medicalkorea-2205a-firebase-adminsdk-fbsvc-70fd6e21f4.json');
    if (fs.existsSync(filePath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ServiceAccount;
      return initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${projectId}.firebasestorage.app`,
      });
    }
  } catch {
    // ignore
  }

  return null;
}

export function getDb(): Firestore {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase not initialized. Set FIREBASE_PRIVATE_KEY env var.');
  _db = getFirestore(app);
  return _db;
}

// Lazy accessor - won't crash during build
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
