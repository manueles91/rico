'use client';

import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from './types';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Define a custom type for code props that includes the inline property
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div
      className={cn(
        'flex w-full items-start gap-2 py-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
      data-component-name="ChatMessage"
    >
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[90%] sm:max-w-[80%]',
          isUser
            ? 'bg-primary text-white dark:bg-primary dark:text-primary-foreground'
            : 'bg-muted dark:bg-secondary text-foreground dark:text-secondary-foreground'
        )}
      >
        {message.imageUrl && (
          <div className="mb-2 relative w-full h-40 sm:h-48 rounded-md overflow-hidden">
            <Image
              src={message.imageUrl}
              alt="Uploaded image"
              fill
              className="object-contain"
            />
          </div>
        )}
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
