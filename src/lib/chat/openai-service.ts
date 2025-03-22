import { OpenAI } from 'openai';
import { ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam, ChatCompletionAssistantMessageParam } from 'openai/resources/chat/completions';
import { AccountDetails } from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an enhanced system prompt with account context
 */
export function generateSystemPrompt(
  accountId: string,
  accountDetails: AccountDetails | null,
  recentExpenses: any[],
  hasImage: boolean
): string {
  return `
You are an AI assistant for an expense tracking application. You're currently helping a user with the account "${accountDetails?.name || 'Unknown'}" (ID: ${accountId}).

Account Information:
- Account Name: ${accountDetails?.name || 'Unknown'}
- Account Type: ${accountDetails?.is_personal ? 'Personal' : 'Shared'}
- Total Expenses: ${accountDetails?.expense_count || 0}

${recentExpenses?.length > 0 ? `Recent Expenses:
${recentExpenses.map((exp: any) => {
  // Safely format the date
  const dateStr = exp.date ? (typeof exp.date === 'string' 
    ? exp.date.substring(0, 10) 
    : new Date(exp.date).toISOString().substring(0, 10)) 
    : 'Unknown date';
    
  return `- ${dateStr}: ${exp.amount} for "${exp.description}" at ${exp.vendor || 'Unknown'} (Categories: ${exp.categories?.filter(Boolean).join(', ') || 'None'})`;
}).join('\n')}
` : 'No recent expenses found.'}

${hasImage ? `
⚠️ IMAGE DETECTED: An image has been uploaded. Your FIRST priority is to process it as an expense receipt.
You MUST extract the following information from the receipt image:
- Total amount (required)
- Vendor/merchant name
- Date of purchase
- Individual items if visible
- Any tax or tip information
- Payment method if available

Even if the user doesn't explicitly ask you to process the receipt, you MUST do so and respond with the extracted information in JSON format.
` : ''}

IMPORTANT RESPONSIBILITIES:
1. AUTOMATICALLY PROCESS ANY IMAGE UPLOADED AS AN EXPENSE RECEIPT - even if the user doesn't explicitly ask you to do so
2. When an image is uploaded, ALWAYS extract and process expense information from it, regardless of what the user says in their message
3. Help the user track their expenses by identifying expense mentions in their messages
4. When you identify an expense (from text or image), ALWAYS include a properly formatted JSON representation of the expense data
5. Propose categories for expenses when not provided by the user
6. Answer questions about spending patterns based on the context provided

When processing an image or identifying an expense, you MUST include a JSON code block with the expense data in this format:
\`\`\`json
{
  "amount": 45.99,
  "description": "Lunch with team",
  "vendor": "Chipotle",
  "date": "2025-03-19",
  "categories": ["Food", "Work"]
}
\`\`\`

Make sure to:
- Format the JSON correctly with double quotes around keys and string values
- Include the date in YYYY-MM-DD format (use today's date if not specified)
- Propose reasonable categories if the user doesn't specify any
- Include all available information (amount, description, vendor, date, categories)

CRITICAL: EVERY TIME a user uploads an image, assume it contains receipt information and try to extract expense details from it, even if the user doesn't explicitly ask you to do so. If you see an image, your first priority is to process it as an expense receipt.

All expenses you identify will be saved to the database for account ${accountId}.
`;
}

/**
 * Prepares messages for the OpenAI API
 */
export function prepareApiMessages(
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    imageUrl?: string;
    imageBase64?: string;
  }>,
  systemPrompt: string,
  requestOrigin?: string
): ChatCompletionMessageParam[] {
  const apiMessages: ChatCompletionMessageParam[] = [];

  // Replace the first system message or add if none exists
  const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
  if (systemMessageIndex >= 0) {
    messages[systemMessageIndex].content = systemPrompt;
  } else {
    messages.unshift({
      role: 'system',
      content: systemPrompt,
    });
  }

  // Process each message
  for (const msg of messages) {
    if (msg.role === 'user' && (msg.imageUrl || msg.imageBase64)) {
      // For user messages with images
      apiMessages.push({
        role: 'user',
        content: [
          { 
            type: "text", 
            text: msg.content 
          },
          {
            type: "image_url",
            image_url: {
              // Prefer base64 data if available, otherwise use URL
              url: msg.imageBase64 || (msg.imageUrl && msg.imageUrl.startsWith('http') 
                ? msg.imageUrl 
                : msg.imageUrl && requestOrigin ? `${requestOrigin}${msg.imageUrl}` : ''),
              detail: "high"
            }
          }
        ]
      } as ChatCompletionUserMessageParam);
    } else if (msg.role === 'system') {
      // For system messages
      apiMessages.push({
        role: 'system',
        content: msg.content
      } as ChatCompletionSystemMessageParam);
    } else if (msg.role === 'assistant') {
      // For assistant messages
      apiMessages.push({
        role: 'assistant',
        content: msg.content
      } as ChatCompletionAssistantMessageParam);
    } else if (msg.role === 'user') {
      // For regular user messages
      apiMessages.push({
        role: 'user',
        content: msg.content
      } as ChatCompletionUserMessageParam);
    }
  }

  return apiMessages;
}

/**
 * Calls the OpenAI API to generate a chat completion
 */
export async function generateChatCompletion(
  apiMessages: ChatCompletionMessageParam[],
  hasImage: boolean
): Promise<string> {
  console.log('Calling OpenAI with messages:', JSON.stringify(apiMessages, null, 2));
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: apiMessages,
    max_tokens: 1000,
    temperature: hasImage ? 0.3 : 0.7, // Lower temperature for more precise receipt extraction
    ...(hasImage && {
      response_format: { type: "text" }, // Ensure we get text response with JSON
    }),
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Extracts expense data from AI response
 */
export function extractExpenseData(aiResponse: string): Array<Record<string, any>> {
  const expenses: Array<Record<string, any>> = [];
  
  // Enhanced regex to find JSON blocks with better accuracy
  const jsonRegex = /```json\s*({[\s\S]*?})\s*```/g;
  let match;
  
  while ((match = jsonRegex.exec(aiResponse)) !== null) {
    try {
      const jsonStr = match[1].trim();
      console.log('Extracted JSON string:', jsonStr);
      
      const expenseData = JSON.parse(jsonStr);
      console.log('Parsed expense data:', expenseData);
      
      // Validate the expense data
      if (!expenseData.amount || isNaN(Number(expenseData.amount))) {
        console.warn('Invalid expense amount:', expenseData.amount);
        continue;
      }
      
      expenses.push(expenseData);
    } catch (jsonError) {
      console.error('Error processing expense JSON:', jsonError);
    }
  }
  
  return expenses;
}
