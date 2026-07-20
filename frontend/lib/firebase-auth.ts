import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  type Auth,
} from "firebase/auth";

import app from "./firebase";

let authInstance: Auth | null = null;

function getLazyAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth = new Proxy({} as Auth, {
  get(target, prop, receiver) {
    if (prop === "then" || prop === "toJSON" || typeof prop === "symbol") {
      return undefined;
    }
    try {
      const auth = getLazyAuth();
      return Reflect.get(auth, prop, receiver);
    } catch (err) {
      return (...args: any[]) => {
        throw err;
      };
    }
  }
});

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();

  provider.addScope("email");
  provider.addScope("profile");

  return signInWithPopup(auth, provider);
}

export async function signInWithGitHub() {
  const provider = new GithubAuthProvider();

  provider.addScope("read:user");
  provider.addScope("user:email");

  return signInWithPopup(auth, provider);
}

export async function loginWithEmail(
  email: string,
  password: string
) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
  email: string,
  password: string
) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}