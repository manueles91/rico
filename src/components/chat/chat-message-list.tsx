'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from './types';
import { ChatMessage } from './chat-message';

interface ChatMessageListProps {
  messages: ChatMessageType[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter out system messages
  const visibleMessages = messages.filter(
    (message) => message.role !== 'system'
  );

  return (
    <div className="flex flex-col gap-2">
      {visibleMessages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No messages yet. Start a conversation!
        </div>
      ) : (
        visibleMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
