'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessage, MessageRole } from '@/components/chat/types';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { FileUpload } from '@/components/chat/file-upload';
import { CameraCapture } from '@/components/chat/camera-capture';
import { toast } from '@/components/ui/use-toast';
import { useAccount } from '@/contexts/account-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { ChatVanishInput } from '@/components/ui/chat-vanish-input';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl px-3 sm:px-4 bg-background dark:bg-background">
      <Suspense fallback={<ChatSkeleton />}>
        <ChatContent />
      </Suspense>
    </div>
  );
}

function ChatContent() {
  const { currentAccount, isLoading: isAccountLoading } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'You are a helpful assistant.',
    },
  ]);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileSource, setFileSource] = useState<'upload' | 'camera' | null>(null);

  // Load conversation history when account changes
  useEffect(() => {
    if (!currentAccount || isAccountLoading) return;
    
    // Reset messages when account changes
    setMessages([
      {
        id: '1',
        role: 'system',
        content: `You are a helpful assistant for the account "${currentAccount.name}".`,
      },
    ]);
    
    // Load conversation history from the database for the current account
    const loadConversationHistory = async () => {
      try {
        const response = await fetch(`/api/conversations/latest?accountId=${currentAccount.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch conversation history');
        }
        
        const data = await response.json();
        
        if (data.success && data.data?.messages?.length > 0) {
          // Add the conversation messages to the chat
          setMessages(prevMessages => {
            // Keep the system message and add the conversation messages
            const systemMessage = prevMessages.find(msg => msg.role === 'system');
            return [
              ...(systemMessage ? [systemMessage] : []),
              ...data.data.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.is_from_ai ? 'assistant' : 'user',
                content: msg.content,
              })),
            ];
          });
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
        toast({
          title: 'Error',
          description: `Failed to load conversation history: ${(error as Error).message}`,
          variant: 'destructive',
        });
      }
    };
    
    loadConversationHistory();
    // Only load when account changes or when explicitly requested
  }, [currentAccount?.id, isAccountLoading]);

  // Handle file selection from either upload or camera
  const handleFileSelect = (file: File) => {
    // Clear any existing file
    if (selectedFile) {
      handleClearFile();
    }
    
    // Set the new file and its source
    setSelectedFile(file);
    setFileSource(file.name.includes('camera-photo') ? 'camera' : 'upload');
    
    // Optional: You could set an appropriate default text input based on the image
    if (input === '') {
      setInput('Add this expense');
    }
  };

  // Clear the selected file
  const handleClearFile = () => {
    setSelectedFile(null);
    setFileSource(null);
    
    // Optional: Clear input if it was auto-set
    if (input === 'Process this receipt' || input === 'Add this expense') {
      setInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() && !selectedFile) return;
    if (!currentAccount) {
      toast({
        title: 'No Account Selected',
        description: 'Please select an account to continue.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    let imageUrl = '';
    let imageBase64 = '';
    
    // Upload image if selected
    if (selectedFile) {
      setIsUploading(true);
      
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadResponse = await fetch('/api/chat/image-upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Failed to upload image');
        }
        
        const data = await uploadResponse.json();
        imageUrl = data.url;
        imageBase64 = data.base64Data;
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Error',
          description: `Failed to upload image: ${(error as Error).message}`,
          variant: 'destructive',
        });
        setIsLoading(false);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }
    
    // Add user message to the list
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: selectedFile ? 'Shared an image' : input.trim() || 'Add this expense',
      ...(imageUrl && { imageUrl }),
      ...(imageBase64 && { imageBase64 }),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSelectedFile(null);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-ID': currentAccount.id,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content, imageUrl, imageBase64 }) => ({
            role,
            content,
            ...(imageUrl && { imageUrl }),
            ...(imageBase64 && { imageBase64 }),
          })),
          accountId: currentAccount.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch response');
      }
      
      const data = await response.json();
      
      // Add assistant message to the list
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.content,
        },
      ]);
      
      // TODO: Save conversation to the database for the current account
      // This would be implemented in a future feature
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: `Failed to get response: ${(error as Error).message}`,
        variant: 'destructive',
      });
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Sorry, there was an error processing your request: ${(error as Error).message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const formEvent = new Event('submit', { cancelable: true, bubbles: true });
        form.dispatchEvent(formEvent);
      }
    }
  };

  if (isAccountLoading) {
    return <ChatSkeleton />;
  }
  
  if (!currentAccount) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">No Account Selected</h2>
        <p className="text-gray-600">
          Please select an account from the dropdown in the header to start chatting.
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className="h-[65vh] sm:h-[70vh] overflow-y-auto mb-2 sm:mb-3 rounded-lg bg-background">
        <ChatMessageList messages={messages} />
      </div>
      
      <div className="p-2 border-t">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2"
        >
          {/* Media buttons side-by-side */}
          <div className="flex gap-2">
            <FileUpload
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              selectedFile={selectedFile}
              isUploading={isUploading}
              className="flex-1"
            />
            <CameraCapture
              onCapture={(file: File) => handleFileSelect(file)}
              onClear={handleClearFile}
              capturedImage={selectedFile}
              isUploading={isUploading}
              className="flex-1"
            />
          </div>
          
          {/* Text input and send button */}
          <div className="flex gap-2">
            {/* Text input area */}
            <div className="relative flex-1">
              <ChatVanishInput
                placeholders={[
                  "Expense 20,000, padel, Puro Padel today",
                  "Add recurring subscription on 1st day of every month, 4,000, for netflix",
                  "What % of my expenses last month was food/dining?",
                  "What are expenses could I reduce to achieve our discussed goal by December?"
                ]}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                value={input}
                disabled={isLoading}
                textareaRef={textareaRef}
                onKeyDown={handleKeyDown}
              />
            </div>
            
            {/* Send button */}
            <Button 
              type="submit" 
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="w-20 sm:w-24 h-12 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function ChatSkeleton() {
  return (
    <>
      <div className="h-[65vh] sm:h-[70vh] overflow-y-auto mb-2 sm:mb-3 rounded-lg bg-background p-2">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <div className="flex items-start gap-3 justify-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="p-2 border-t">
        <div className="flex flex-col gap-2">
          {/* Media buttons skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
          
          {/* Text input and send button skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-20 sm:w-24" />
          </div>
        </div>
      </div>
    </>
  );
}
