import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OpenAI API key. Please set NEXT_PUBLIC_OPENAI_API_KEY in your .env.local file');
}

// Create OpenAI client
export const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true // Note: In production, calls should be made through a backend
});
