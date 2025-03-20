import "server-only";

import { StackServerApp } from "@stackframe/stack";

// Only initialize Stack Auth if the required environment variables are set
const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;

// Create a proper StackServerApp instance regardless of environment variables
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  projectId: projectId || "dummy-project-id",
  publishableClientKey: publishableClientKey || "dummy-publishable-key",
  secretServerKey: secretServerKey || "dummy-secret-key",
  urls: {
    signIn: '/handler/sign-in',
    signUp: '/handler/sign-up',
    afterSignIn: '/',
    afterSignUp: '/',
    afterSignOut: '/',
  }
});

// If environment variables are not set, override the getUser method to return null
if (!projectId || !publishableClientKey || !secretServerKey) {
  // @ts-ignore - Override the getUser method
  stackServerApp.getUser = async (options: { or?: "redirect" | "throw" } = {}) => {
    if (options.or === "throw") {
      throw new Error("Stack Auth is not configured. Please set the required environment variables.");
    }
    return null;
  };
}
