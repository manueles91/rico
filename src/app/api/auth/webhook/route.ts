import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

// Webhook event schema
const webhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    profileImageUrl: z.string().nullable(),
  }),
  timestamp: z.number(),
});

type WebhookEvent = z.infer<typeof webhookEventSchema>;

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.STACK_WEBHOOK_SECRET;
    
    if (!authHeader || !webhookSecret || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== webhookSecret) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse the webhook event
    const rawBody = await request.text();
    const event = webhookEventSchema.parse(JSON.parse(rawBody));

    // Handle different event types
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
      default:
        // Ignore other event types
        break;
    }

    return new Response('Webhook processed', { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(`Error processing webhook: ${error.message}`, { status: 500 });
  }
}

async function handleUserCreated(userData: WebhookEvent['data']) {
  // Check if user already exists in our database
  const existingUser = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [userData.email]
  );

  if (existingUser) {
    // User already exists, update their info
    await query(
      `UPDATE users 
       SET name = $1, 
           avatar_url = $2,
           updated_at = NOW()
       WHERE email = $3`,
      [userData.displayName, userData.profileImageUrl, userData.email]
    );
  } else {
    // Create new user
    await query(
      `INSERT INTO users (id, email, name, avatar_url) 
       VALUES ($1, $2, $3, $4)`,
      [userData.id, userData.email, userData.displayName, userData.profileImageUrl]
    );
  }
}

async function handleUserUpdated(userData: WebhookEvent['data']) {
  // Update user in our database
  await query(
    `UPDATE users 
     SET name = $1, 
         avatar_url = $2,
         updated_at = NOW()
     WHERE email = $3`,
    [userData.displayName, userData.profileImageUrl, userData.email]
  );
}

async function handleUserDeleted(userData: WebhookEvent['data']) {
  // Mark user as deleted or remove from our database
  // For now, we'll keep the user but you might want to implement a soft delete
  // or cascade delete depending on your requirements
  await query(
    `UPDATE users 
     SET updated_at = NOW()
     WHERE email = $1`,
    [userData.email]
  );
}
