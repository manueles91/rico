'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage, MessageRole } from '@/components/chat/types';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { FileUpload } from '@/components/chat/file-upload';
import { toast } from '@/components/ui/use-toast';
import { useAccount } from '@/contexts/account-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Plus, X, Image, Camera, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Home() {
  return (
    <div className="container mx-auto max-w-4xl py-4 px-3 sm:py-6 sm:px-4">
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Camera handling
  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera, cameraStream]);

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
      content: input.trim() || 'Add this expense',
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (input.trim() || selectedFile) {
      const form = document.createElement('form');
      handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCameraCapture = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setCameraStream(stream);
        setShowCamera(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        toast({
          title: 'Error',
          description: 'Failed to access camera. Please check your permissions.',
          variant: 'destructive',
        });
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            setShowCamera(false);

            if (cameraStream) {
              cameraStream.getTracks().forEach((track) => track.stop());
              setCameraStream(null);
            }
          }
        }, 'image/jpeg');
      }
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden bg-gray-950 dark:bg-black rounded-xl shadow-xl border border-gray-800">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-950 to-gray-900 dark:from-black dark:to-gray-900">
        <ChatMessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900 dark:bg-gray-900 rounded-t-xl shadow-inner">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex space-x-2 overflow-hidden"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 dark:text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-5 w-5" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 dark:text-white"
                  onClick={handleCameraCapture}
                >
                  <Camera className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 dark:text-white"
                  disabled={true}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="w-full p-3 bg-gray-800 dark:bg-gray-800 border-none rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {selectedFile && (
              <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg p-2 flex items-center">
                <span className="text-xs text-white truncate max-w-[150px]">{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-2 text-gray-400 hover:text-white"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-all duration-300",
              (input.trim() || selectedFile)
                ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                : "bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white"
            )}
            disabled={isLoading || (!input.trim() && !selectedFile)}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* Camera Overlay */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-gray-800/50 text-white"
              onClick={closeCamera}
            >
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-white font-medium">Take a photo</h2>
            <div className="w-10" />
          </div>

          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          </div>

          <div className="p-6 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-full bg-white border-4 border-gray-800"
              onClick={capturePhoto}
            >
              <div className="h-12 w-12 rounded-full bg-gray-800" />
            </Button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden bg-gray-950 dark:bg-black rounded-xl shadow-xl border border-gray-800">
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-start space-x-2 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-20 w-2/3 rounded-lg" />
        </div>
        <div className="flex items-start justify-end space-x-2 mb-4">
          <Skeleton className="h-16 w-2/3 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex items-start space-x-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-24 w-3/4 rounded-lg" />
        </div>
      </div>
      <div className="p-4 bg-gray-900 dark:bg-gray-900 rounded-t-xl">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
