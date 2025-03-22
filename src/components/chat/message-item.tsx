'use client';

import { ChatMessage as ChatMessageType } from './types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BarChart3, Calendar, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageItemProps {
  message: ChatMessageType;
  isConsecutive?: boolean;
}

// Define a custom type for code props that includes the inline property
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function MessageItem({ message, isConsecutive = false }: MessageItemProps) {
  const isUser = message.role === 'user';

  const getBubbleStyle = () => {
    const baseStyle = "p-3 shadow-sm";

    if (isUser) {
      return cn(baseStyle, "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-sm");
    } else {
      return cn(baseStyle, "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-2xl rounded-tl-sm");
    }
  };

  // Handle image messages
  if (message.imageUrl) {
    return (
      <div className={cn("mb-2", isConsecutive ? "mt-1" : "mt-4")}>
        <div className={getBubbleStyle()}>
          <div className="relative h-60 w-full rounded-lg overflow-hidden">
            <Image
              src={message.imageUrl}
              alt="Uploaded image"
              fill
              className="object-cover"
            />
          </div>
          {message.content && <p className="mt-2 text-sm">{message.content}</p>}
        </div>
      </div>
    );
  }

  // Default text message
  return (
    <div className={cn("mb-2", isConsecutive ? "mt-1" : "mt-4")}>
      <div className={getBubbleStyle()}>
        <div className={cn(
          'prose prose-sm dark:prose-invert max-w-none break-words',
          isUser && 'prose-p:text-white prose-headings:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white'
        )}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Override default element styling
              p: ({ children }) => <p className={`mb-2 whitespace-pre-wrap ${isUser ? 'text-white' : ''}`}>{children}</p>,
              ul: ({ children }) => <ul className={`mb-2 list-disc pl-4 ${isUser ? 'text-white' : ''}`}>{children}</ul>,
              ol: ({ children }) => <ol className={`mb-2 list-decimal pl-4 ${isUser ? 'text-white' : ''}`}>{children}</ol>,
              li: ({ children }) => <li className={`mb-1 ${isUser ? 'text-white' : ''}`}>{children}</li>,
              h1: ({ children }) => <h1 className={`text-xl font-bold mb-2 ${isUser ? 'text-white' : ''}`}>{children}</h1>,
              h2: ({ children }) => <h2 className={`text-lg font-bold mb-2 ${isUser ? 'text-white' : ''}`}>{children}</h2>,
              h3: ({ children }) => <h3 className={`text-md font-bold mb-2 ${isUser ? 'text-white' : ''}`}>{children}</h3>,
              code: ({ node, inline, className, children, ...props }: CodeComponentProps) => {
                const match = /language-(\w+)/.exec(className || '');
                if (inline) {
                  return <code className={`bg-muted-foreground/20 dark:bg-background/50 rounded px-1 py-0.5 ${isUser ? 'text-white' : ''}`}>{children}</code>;
                }
                return (
                  <pre className={`bg-muted-foreground/20 dark:bg-background/50 rounded p-2 overflow-x-auto mb-2 text-xs sm:text-sm ${isUser ? 'text-white' : ''}`}>
                    <code className={match ? `language-${match[1]}` : ''} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
