import { ExpenseData } from './types';
import { 
  createExpense, 
  processExpenseCategories, 
  updateConversationWithExpenseContext,
  getExpenseCount
} from './db-operations';

/**
 * Processes expenses extracted from AI response
 */
export async function processExpenses(
  aiResponse: string,
  accountId: string,
  userId: string,
  conversationId: string,
  hasImage: boolean
): Promise<number> {
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
        
        const expenseData = JSON.parse(jsonStr) as ExpenseData;
        console.log('Parsed expense data:', expenseData);
        
        // Validate the expense data
        if (!expenseData.amount || isNaN(Number(expenseData.amount))) {
          console.warn('Invalid expense amount:', expenseData.amount);
          continue;
        }
        
        // Create the expense
        const newExpense = await createExpense(accountId, userId, conversationId, expenseData);
        
        if (newExpense && expenseData.categories) {
          // Process categories if provided
          await processExpenseCategories(accountId, newExpense.id, expenseData.categories);
        }
        
        foundExpenses++;
      } catch (jsonError) {
        console.error('Error processing expense JSON:', jsonError);
      }
    }
    
    console.log(`Found and processed ${foundExpenses} expenses`);
    
    // Update conversation with expense context if expenses were found
    if (foundExpenses > 0) {
      await updateConversationWithExpenseContext(conversationId);
    }
    
    // Debug: Check if there are any expenses in the database
    try {
      const expenseCount = await getExpenseCount(accountId);
      console.log('Current expense count in database:', expenseCount);
    } catch (error) {
      console.error('Error checking expense count:', error);
    }
    
    return foundExpenses;
  } catch (error) {
    console.error('Error extracting expense data:', error);
    return 0;
  }
}
