import { FirebaseError } from "firebase/app"
import { ApiError } from "@/client"

const firebaseAuthMessages: Record<string, string> = {
  "auth/email-already-in-use": "An account already exists for this email.",
  "auth/invalid-credential": "Incorrect email or password",
  "auth/popup-blocked": "Allow popups for this site, then try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/requires-recent-login": "Log in again before changing your password.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/user-disabled": "This account is disabled.",
  "auth/user-not-found": "Incorrect email or password",
  "auth/weak-password": "Password must be at least 8 characters",
  "auth/wrong-password": "Incorrect email or password",
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return firebaseAuthMessages[error.code] ?? "Authentication failed."
  }

  if (error instanceof ApiError) {
    const detail = (error.body as any)?.detail
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0].msg
    }
    if (detail) {
      return detail
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Authentication failed."
}

export function isFirebaseUserNotFoundError(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "auth/user-not-found"
}
