import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
} from "firebase/auth";

import app from "./firebase";

export const auth = getAuth(app);

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