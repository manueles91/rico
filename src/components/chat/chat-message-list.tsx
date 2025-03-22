'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from './types';
import { MessageItem } from './message-item';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatMessageListProps {
  messages: ChatMessageType[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  // Filter out system messages
  const visibleMessages = messages.filter(
    (message) => message.role !== 'system'
  );

  return (
    <div className="flex flex-col space-y-4">
      <AnimatePresence>
        {visibleMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          visibleMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className={cn("max-w-[85%]", message.role === "user" ? "ml-auto" : "mr-auto")}
            >
              <MessageItem 
                message={message} 
                isConsecutive={index > 0 && visibleMessages[index - 1].role === message.role}
              />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
