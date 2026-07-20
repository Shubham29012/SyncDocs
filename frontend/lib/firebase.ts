import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;

function getLazyApp(): FirebaseApp {
  if (!appInstance) {
    if (!firebaseConfig.apiKey) {
      throw new Error(
        "Missing Firebase configuration. Please configure NEXT_PUBLIC_FIREBASE_API_KEY and other Firebase variables."
      );
    }
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
  }
  return appInstance;
}

const app = new Proxy({} as FirebaseApp, {
  get(target, prop) {
    if (prop === "then" || prop === "toJSON" || typeof prop === "symbol") {
      return undefined;
    }
    const realApp = getLazyApp();
    const value = Reflect.get(realApp, prop);
    if (typeof value === "function") {
      return value.bind(realApp);
    }
    return value;
  }
});

export default app;
