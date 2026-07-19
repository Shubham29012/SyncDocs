import { initializeApp, cert, getApps, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

function getApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  // 1. Try individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawKey) {
    const privateKey = rawKey.replace(/\\n/g, "\n");
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // 2. Fall back to service account JSON file path
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    try {
      let resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
      if (!fs.existsSync(resolvedPath)) {
        // Fallback: check if process is running from workspace root instead of backend folder
        resolvedPath = path.resolve(process.cwd(), "backend", serviceAccountPath);
      }
      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, "utf8");
        const serviceAccount = JSON.parse(fileContent);

        // Map snake_case JSON keys to camelCase ServiceAccount keys to fix the TypeScript error
        const credentialObj: ServiceAccount = {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        };

        return initializeApp({
          credential: cert(credentialObj),
        });
      }
    } catch (error) {
      console.error("Failed to load Firebase service account from file:", error);
    }
  }

  throw new Error(
    "Missing Firebase Admin credentials. Please configure either FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or set a valid FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}

const app = getApp();

export { app as firebaseAdmin };
export const adminAuth = getAuth(app);