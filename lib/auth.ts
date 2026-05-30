import { auth } from "@/auth";

/**
 * Gets the current NextAuth session on the server.
 */
export async function getSession() {
  return await auth();
}

/**
 * Gets the logged-in user details from the session.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}
