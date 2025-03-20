import "server-only";

import { StackServerApp } from "@stackframe/stack";

// Only initialize Stack Auth if the required environment variables are set
const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;

export const stackServerApp = projectId && publishableClientKey && secretServerKey
  ? new StackServerApp({
      tokenStore: "nextjs-cookie",
      projectId,
      publishableClientKey,
      secretServerKey,
      urls: {
        signIn: '/handler/sign-in',
        signUp: '/handler/sign-up',
        afterSignIn: '/',
        afterSignUp: '/',
        afterSignOut: '/',
      }
    })
  : {
      // Provide fallback methods to prevent runtime errors
      getUser: async (options: { or?: "redirect" | "throw" } = {}) => {
        if (options.or === "throw") {
          throw new Error("Stack Auth is not configured. Please set the required environment variables.");
        }
        if (options.or === "redirect") {
          // No-op in fallback mode
        }
        return null;
      }
    } as StackServerApp;
