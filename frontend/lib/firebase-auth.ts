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

export function getClientAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();

  provider.addScope("email");
  provider.addScope("profile");

  return signInWithPopup(getClientAuth(), provider);
}

export async function signInWithGitHub() {
  const provider = new GithubAuthProvider();

  provider.addScope("read:user");
  provider.addScope("user:email");

  return signInWithPopup(getClientAuth(), provider);
}

export async function loginWithEmail(
  email: string,
  password: string
) {
  return signInWithEmailAndPassword(getClientAuth(), email, password);
}

export async function registerWithEmail(
  email: string,
  password: string
) {
  return createUserWithEmailAndPassword(getClientAuth(), email, password);
}

export async function logout() {
  return signOut(getClientAuth());
}