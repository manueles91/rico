import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { 
  messageSchema,
  verifyAccountAccess,
  getOrCreateConversation,
  getAccountDetails,
  getRecentExpenses,
  saveUserMessage,
  saveAIResponse,
  updateConversation,
  generateSystemPrompt,
  prepareApiMessages,
  generateChatCompletion,
  processExpenses
} from '@/lib/chat';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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
    const hasAccess = await verifyAccountAccess(accountId, stackUser.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this account' },
        { status: 403 }
      );
    }

    // Find or create a conversation for this account
    const conversation = await getOrCreateConversation(accountId);

    // Get account details and recent expenses for context
    const accountDetails = await getAccountDetails(accountId);
    const recentExpenses = await getRecentExpenses(accountId);

    // Check if any message contains an image
    const hasImage = messages.some(msg => msg.role === 'user' && (msg.imageUrl || msg.imageBase64));

    // Generate system prompt with enhanced context
    const systemPrompt = generateSystemPrompt(accountId, accountDetails, recentExpenses, hasImage);

    // Prepare messages for OpenAI API
    const apiMessages = prepareApiMessages(messages, systemPrompt, request.nextUrl.origin);

    try {
      // Call OpenAI to generate a response
      const aiResponse = await generateChatCompletion(apiMessages, hasImage);

      if (aiResponse) {
        // Save the user's last message to the conversation
        const userMessage = messages.filter(msg => msg.role === 'user').pop();
        if (userMessage) {
          await saveUserMessage(conversation.id, stackUser.id, userMessage.content);
        }
        
        // Save the AI response to the conversation
        await saveAIResponse(conversation.id, aiResponse);
        
        // Update the conversation title or timestamp
        await updateConversation(conversation, userMessage?.content);

        // Process any expenses found in the AI response
        await processExpenses(aiResponse, accountId, stackUser.id, conversation.id, hasImage);
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
