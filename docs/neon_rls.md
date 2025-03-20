About Neon RLS
Secure your application at the database level using Postgres's Row-Level Security

What you will learn:
JSON Web Tokens (JWT)

Row-level Security (RLS)

How Neon RLS works

Related docs
Neon RLS Tutorial
Postgres Row-Level Security tutorial
Simplify RLS with Drizzle
Neon RLS integrates with third-party JWT-based authentication providers like Auth0 and Clerk, bringing authorization closer to your data by leveraging Row-Level Security (RLS) at the database level.

Authentication and authorization
When implementing user authentication in your application, third-party authentication providers like Clerk, Auth0, and others simplify the process of managing user identities, passwords, and security tokens. Once a user's identity is confirmed, the next step is authorization — controlling who can do what in your app based on their user type or role — for example, admins versus regular users. With Neon RLS, you can manage authorization directly within Postgres, either alongside or as a complete replacement for security at other layers.

How Neon RLS works
Most authentication providers issue JSON Web Tokens (JWTs) on user authentication to convey user identity and claims. The JWT is a secure way of proving that logged-in users are who they say they are — and passing that proof on to other entities.

With Neon RLS, the JWT is passed on to Neon, where you can make use of the validated user identity directly in Postgres. To integrate with an authentication provider, you will add your provider's JWT discovery URL to your Neon project. This lets Neon retrieve the necessary keys to validate the JWTs.

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_AUTHENTICATED_URL, { authToken: myAuthProvider.getJWT() });
await sql(`select * from todos`);
Behind the scenes, the Neon Proxy performs the validation, while Neon's open source pg_session_jwt extension makes the extracted user_id available to Postgres. You can then use Row-Level Security (RLS) policies in Postgres to enforce access control at the row level, ensuring that users can only access or modify data according to the defined rules. Since these rules are implemented directly in the database, they can offer a secure fallback — or even a primary authorization solution — in case security in other layers of your application fail. See when to rely on RLS for more information.

Neon RLS architecture

Database roles
Neon RLS works with two database roles, identified by connection string prefixes:

Authenticated role (authenticated@): For users who are logged in. Requires a valid JWT token from your authentication provider.
Anonymous role (anonymous@): Currently requires authentication similar to the authenticated role. This implementation is under review and may change in the future to better support unauthenticated access.
note
For now, if you need to implement public access in your application, we recommend creating a separate database role with a password. This provides a simpler alternative to using the anonymous role while we work on improving anonymous access support.

Using Neon RLS with custom JWTs
If you don't want to use a third-party authentication provider, you can build your application to generate and sign its own JWTs. Here's a sample application that demonstrates this approach: See demo

Before and after Neon RLS
Let's take a before/after look at moving authorization from the application level to the database to demonstrate how Neon RLS offers a different approach to securing your application.

Before Neon RLS (application-level checks):
In a traditional setup, you might handle authorization for a function directly in your backend code:

export async function insertTodo(newTodo: { newTodo: string; userId: string }) {
  const { userId, getToken } = auth(); // Gets the user's ID and getToken from the JWT or session
  const authToken = await getToken(); // Await the getToken function
  if (!userId) throw new Error('No user logged in'); // No user authenticated
  if (newTodo.userId !== userId) throw new Error('Unauthorized'); // User mismatch
  const db = drizzle(process.env.DATABASE_AUTHENTICATED_URL!, { schema });
  return db.$withAuth(authToken).insert(schema.todos).values({
    task: newTodo.newTodo,
    isComplete: false,
    userId, // Explicitly ties todo to the user
  });
}
In this case, you have to:

Check if the user is authenticated and their userId matches the data they are trying to modify.
Handle both task creation and authorization in the backend code.
After Neon RLS (RLS in the database):
With Neon RLS, you only need to pass the JWT to the database - authorization checks happen automatically through RLS policies:

Drizzle
SQL
pgPolicy('create todos', {
  for: 'insert',
  to: 'authenticated',
  withCheck: sql`(select auth.user_id() = user_id)`,
});
Now, in your backend, you can simplify the logic, removing the user authentication checks and explicit authorization handling.

export async function insertTodo({ newTodo }: { newTodo: string }) {
  const { getToken } = auth();
  const authToken = await getToken();
  const db = drizzle(process.env.DATABASE_AUTHENTICATED_URL!, { schema });
  return db.$withAuth(authToken).insert(schema.todos).values({
    task: newTodo,
    isComplete: false,
  });
}
This approach is flexible: you can manage RLS policies directly in SQL, or use an ORM like Drizzle to centralize them within your schema. Keeping both schema and authorization in one place can make it easier to maintain security. Some ORMs like Drizzle are adding support for declaritive RLS, which makes the logic easier to scan and scale.

How Neon RLS gets auth.user_id() from the JWT
Let's break down the RLS policy controlling who can view todos to see what Neon RLS is actually doing:

Drizzle
SQL
pgPolicy('view todos', {
  for: 'select',
  to: 'authenticated',
  using: sql`(select auth.user_id() = user_id)`,
});
This policy enforces that an authenticated user can only view their own todos. Here's how each component works together.

What Neon does for you
When your application makes a request, Neon validates the JWT by checking its signature and expiration date against a public key. Once validated, Neon extracts the user_id from the JWT and uses it in the database session, making it accessible for RLS.

How the pg_session_jwt extension works
The pg_session_jwt extension enables RLS policies to verify user identity directly within SQL queries:

using: sql`(select auth.user_id() = user_id)`,
auth.user_id(): This function, provided by pg_session_jwt, retrieves the authenticated user's ID from the JWT (it looks for it in the sub field).
user_id: This refers to the user_id column in the todos table, representing the owner of each to-do item.
The RLS policy compares the user_id from the JWT with the user_id in the todos table. If they match, the user is allowed to view their own todos; if not, access is denied.

When to rely on RLS
For early-stage applications, RLS might offer all the security you need to scale your project. For more mature applications or architectures where multiple backends read from the same database, RLS centralizes authorization rules within the database itself. This way, every service that accesses your database can benefit from secure, consistent access controls without needing to reimplement them individually in each connecting application.

RLS can also act as a backstop or final guarantee to prevent data leaks. Even if other security layers fail — for example, a front-end component exposes access to a part of your app that it shouldn't, or your backend misapplies authorization — RLS ensures that unauthorized users will not be able to interact with your data. In these cases, the exposed action will fail, protecting your sensitive database-backed resources.

Supported providers
Here is a non-exhaustive list of authentication providers. The table shows which providers Neon RLS supports, links out to provider documentation for details, and the discovery URL pattern each provider typically uses.

Provider	Supported?	JWKS URL	Documentation
Clerk	✅	https://{yourClerkDomain}/.well-known/jwks.json	docs
Stack Auth	✅	https://api.stack-auth.com/api/v1/projects/{project_id}/.well-known/jwks.json	docs
Auth0	✅	https://{yourDomain}/.well-known/jwks.json	docs
Firebase Auth / GCP Identity Platform	✅	https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com	docs
Stytch	✅	https://{live_or_test}.stytch.com/v1/sessions/jwks/{project-id}	docs
Keycloak	✅	https://{your-keycloak-domain}/auth/realms/{realm-name}/protocol/openid-connect/certs	docs
Supabase Auth	❌	Not supported until Supabase supports asymmetric keys.	N/A
Amazon Cognito	✅	https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json	docs
Azure AD	✅	https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys	docs
Google Identity	✅	https://www.googleapis.com/oauth2/v3/certs	docs
Descope Auth	✅	https://api.descope.com/{YOUR_DESCOPE_PROJECT_ID}/.well-known/jwks.json	docs
PropelAuth	✅	https://{PROPEL_AUTH_URL}/.well-known/jwks.json	docs
SuperTokens	✅	https://{YOUR_SUPER_TOKENS_CORE_CONNECTION_URI}/.well-known/jwks.json	docs
WorkOS	✅	https://api.workos.com/sso/jwks/{YOUR_CLIENT_ID}	docs
JWT Audience Checks
Neon RLS can also verify the aud claim in the JWT. This is useful if you want to restrict access to a specific application or service.

For authentication providers such as Firebase Auth and GCP Cloud Identity, Neon RLS mandates the definition of an expected audience. This is because these providers share the same JWKS URL for all of their projects.

The configuration of the expected audience can be done via the Neon RLS UI or via the Neon RLS API.

Sample applications
You can use these sample ToDo applications to get started using Neon RLS with popular authentication providers.

Clerk (Frontend) + Neon RLS
A Todo List built with Clerk, Next.js, and Neon RLS (SQL from the Frontend)

Stack Auth + Neon RLS
A Todo List built with Stack Auth, Next.js, and Neon RLS (SQL from the Backend)

Auth0 + Neon RLS
A Todo List built with Auth0, Next.js, and Neon RLS (SQL from the Backend)

Stytch + Neon RLS
A Todo List built with Stytch, Next.js, and Neon RLS (SQL from the Backend)

Azure AD B2C + Neon RLS
A Todo List built with Azure AD B2C, Next.js, and Neon RLS (SQL from the Backend)

Descope + Neon RLS
A Todo list built with Descope, Next.js, and Neon RLS (SQL from the frontend)

PropelAuth + Neon RLS
A Todo list built with PropelAuth, Next.js, and Neon RLS (SQL from Frontend and Backend)

SuperTokens + Neon RLS
A Demo app built with SuperTokens, Nest.js, Solid.js, Drizzle, and Neon RLS (SQL from the Backend)

WorkOS + Neon RLS
A Demo Post App built with WorkOS, SvelteKit, Neon RLS (SQL from the Backend)

Neon RLS with custom JWTs
A demo of Neon RLS with custom generated JWTs

Current limitations
While this feature is in its early-access phase, there are some limitations to be aware of:

Authentication provider requirements:
Your authentication provider must support Asymmetric Keys. For example, Supabase Auth will not be compatible until asymetric key support is added. You can track progress on this item here.
The provider must generate a unique set of public keys for each project and expose those keys via a unique URL for each project.
Connection type: Your application must use HTTP to connect to Neon. At this time, TCP and WebSockets connections are not supported. This means you need to use the Neon serverless driver over HTTP as your Postgres driver.
JWT expiration delay: After removing an authentication provider from your project, it may take a few minutes for JWTs signed by that provider to stop working.
Algorithm support: Only JWTs signed with the ES256 and RS256 algorithms are supported.
These limitations will evolve as we continue developing the feature. If you have any questions or run into issues, please let us know.