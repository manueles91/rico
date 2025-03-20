import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { query, queryOne } from '@/lib/db';
import { OpenAI } from 'openai';
import { z } from 'zod';
import { ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam, ChatCompletionAssistantMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const messageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
      imageUrl: z.string().optional(),
      imageBase64: z.string().optional(),
    })
  ),
  accountId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use this API' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const { messages, accountId } = messageSchema.parse(body);

    // Verify user has access to the account
    const accountAccess = await queryOne(
      `SELECT am.* 
       FROM account_members am
       WHERE am.account_id = $1 AND am.user_id = $2`,
      [accountId, stackUser.id],
      { useAuthenticated: true }
    );

    if (!accountAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this account' },
        { status: 403 }
      );
    }

    // Find or create a conversation for this account
    let conversation = await queryOne(
      'SELECT * FROM conversations WHERE account_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [accountId],
      { useAuthenticated: true }
    );

    if (!conversation) {
      conversation = await queryOne(
        'INSERT INTO conversations (id, account_id, title, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING *',
        [accountId, 'New Conversation'],
        { useAuthenticated: true }
      );
    }

    // Get account details for context
    const accountDetails = await queryOne(
      'SELECT a.*, COUNT(e.id) as expense_count FROM accounts a LEFT JOIN expenses e ON a.id = e.account_id WHERE a.id = $1 GROUP BY a.id',
      [accountId],
      { useAuthenticated: true, useCache: true }
    );

    // Get recent expenses for context (last 5)
    const recentExpenses = await query(
      `SELECT e.*, array_agg(c.name) as categories
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.id = ec.expense_id
       LEFT JOIN categories c ON ec.category_id = c.id
       WHERE e.account_id = $1
       GROUP BY e.id
       ORDER BY e.date DESC
       LIMIT 5`,
      [accountId],
      { useAuthenticated: true, useCache: true }
    );

    // Check if any message contains an image
    const hasImage = messages.some(msg => msg.role === 'user' && (msg.imageUrl || msg.imageBase64));

    // Add system message with enhanced context
    const enhancedSystemPrompt = `
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

    // Replace the first system message or add if none exists
    const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex >= 0) {
      messages[systemMessageIndex].content = enhancedSystemPrompt;
    } else {
      messages.unshift({
        role: 'system',
        content: enhancedSystemPrompt,
      });
    }

    // Prepare messages for OpenAI API
    const apiMessages: ChatCompletionMessageParam[] = [];

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
                  : msg.imageUrl ? `${request.nextUrl.origin}${msg.imageUrl}` : ''),
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

    // Call OpenAI
    try {
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

      // Save AI response
      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        // Save the user's last message to the conversation
        const userMessage = messages.filter(msg => msg.role === 'user').pop();
        if (userMessage) {
          await query(
            'INSERT INTO messages (id, conversation_id, user_id, content, is_from_ai, created_at) VALUES (gen_random_uuid(), $1, $2, $3, false, NOW())',
            [conversation.id, stackUser.id, userMessage.content],
            { useAuthenticated: true }
          );
        }
        
        // Save the AI response to the conversation
        await query(
          'INSERT INTO messages (id, conversation_id, content, is_from_ai, created_at) VALUES (gen_random_uuid(), $1, $2, true, NOW())',
          [conversation.id, aiResponse],
          { useAuthenticated: true }
        );
        
        // Update the conversation title if it's a new conversation
        if (conversation.title === 'New Conversation') {
          const userContent = userMessage?.content || '';
          const title = userContent.length > 50 
            ? userContent.substring(0, 47) + '...' 
            : userContent;
            
          await query(
            'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2',
            [title || 'New Conversation', conversation.id],
            { useAuthenticated: true }
          );
        } else {
          // Just update the timestamp
          await query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [conversation.id],
            { useAuthenticated: true }
          );
        }

        // Debug: Check if there are any expenses in the database
        try {
          const expenses = await query(
            'SELECT COUNT(*) as count FROM expenses WHERE account_id = $1',
            [accountId],
            { useAuthenticated: true }
          );
          console.log('Current expense count in database:', expenses[0]?.count);
          
          // Check if the expenses table exists and its structure
          const tableInfo = await query(
            `SELECT column_name, data_type 
             FROM information_schema.columns 
             WHERE table_name = 'expenses'`,
            [],
            { useAuthenticated: true }
          );
          console.log('Expenses table structure:', tableInfo);
        } catch (error) {
          console.error('Error checking expense count:', error);
        }

        // Check if the response contains expense data
        try {
          console.log('AI Response:', aiResponse);
          
          // Enhanced regex to find JSON blocks with better accuracy
          const jsonRegex = /```json\s*({[\s\S]*?})\s*```/g;
          let match;
          let foundExpenses = 0;
          
          // If an image was uploaded but no JSON was found in the response,
          // log a warning as this indicates the LLM didn't follow instructions
          if (hasImage && !jsonRegex.test(aiResponse)) {
            console.warn('Image was uploaded but no expense JSON was found in the response');
          }
          
          // Reset regex state
          jsonRegex.lastIndex = 0;
          
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
              
              // Format the date (use today if not provided or invalid)
              const today = new Date().toISOString().split('T')[0];
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
              const date = expenseData.date && dateRegex.test(expenseData.date) 
                ? expenseData.date 
                : today;
              
              // Insert the expense with account context
              const newExpense = await query(
                `INSERT INTO expenses (
                  id, account_id, amount, description, vendor, date, 
                  created_by, created_at, updated_at, metadata
                )
                VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, $5, 
                  $6, NOW(), NOW(), $7
                )
                RETURNING *`,
                [
                  accountId,
                  Number(expenseData.amount),
                  expenseData.description || 'Expense from chat',
                  expenseData.vendor || null,
                  date,
                  stackUser.id,
                  { source: 'chat', conversation_id: conversation.id }
                ],
                { useAuthenticated: true }
              );
              
              console.log('Inserted expense:', newExpense[0]);
              
              // Process categories if provided
              if (expenseData.categories && Array.isArray(expenseData.categories) && expenseData.categories.length > 0) {
                for (const categoryName of expenseData.categories) {
                  // Find or create the category
                  let category = await queryOne(
                    'SELECT * FROM categories WHERE account_id = $1 AND LOWER(name) = LOWER($2)',
                    [accountId, categoryName],
                    { useAuthenticated: true }
                  );
                  
                  if (!category) {
                    category = await queryOne(
                      'INSERT INTO categories (id, account_id, name, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING *',
                      [accountId, categoryName],
                      { useAuthenticated: true }
                    );
                    console.log('Created new category:', category);
                  }
                  
                  // Link expense to category
                  await query(
                    'INSERT INTO expense_categories (expense_id, category_id) VALUES ($1, $2)',
                    [newExpense[0].id, category.id],
                    { useAuthenticated: true }
                  );
                }
              }
              
              foundExpenses++;
            } catch (jsonError) {
              console.error('Error processing expense JSON:', jsonError);
            }
          }
          
          console.log(`Found and processed ${foundExpenses} expenses`);
          
          // Update conversation with expense context if expenses were found
          if (foundExpenses > 0) {
            await query(
              'UPDATE conversations SET updated_at = NOW(), metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{has_expenses}\', \'true\') WHERE id = $1',
              [conversation.id],
              { useAuthenticated: true }
            );
          }
        } catch (error) {
          console.error('Error extracting expense data:', error);
        }
      }

      return NextResponse.json({
        success: true,
        content: aiResponse,
        data: {
          conversation,
          messages: [
            ...messages,
            {
              id: 'temp-ai-response',
              role: 'assistant',
              content: aiResponse,
            },
          ],
        },
      });
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return NextResponse.json(
        { error: 'Failed to generate response', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  }
}
