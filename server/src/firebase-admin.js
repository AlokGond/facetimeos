import './config.js';

export const firebaseAdminConfigured = () => Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
async function adminApp() {
  const { applicationDefault, cert, getApps, initializeApp } = await import('firebase-admin/app');
  const existing = getApps().find(app => app.name === 'facetimeos-server');
  if (existing) return existing;
  if (!firebaseAdminConfigured()) throw new Error('Firebase Admin is not configured. Add the service-account secret on Render.');
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try { credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)); }
    catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is invalid. Use the complete Firebase service-account JSON.'); }
  } else credential = applicationDefault();
  return initializeApp({ credential, ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}) }, 'facetimeos-server');
}
export const firebaseAuth = async () => {
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(await adminApp());
};
export const firestore = async () => {
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(await adminApp(), process.env.FIRESTORE_DATABASE_ID || '(default)');
};
