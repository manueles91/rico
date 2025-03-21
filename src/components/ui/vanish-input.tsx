'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface VanishInputProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const VanishInput = React.forwardRef<HTMLDivElement, VanishInputProps>(
  ({ className, children, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasContent, setHasContent] = React.useState(false);
    const childRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Handle focus events on the child textarea
    React.useEffect(() => {
      const child = childRef.current;
      if (!child) return;

      const handleFocus = () => setIsFocused(true);
      const handleBlur = () => setIsFocused(false);
      const handleInput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        setHasContent(!!target.value.trim());
      };

      child.addEventListener('focus', handleFocus);
      child.addEventListener('blur', handleBlur);
      child.addEventListener('input', handleInput);

      return () => {
        child.removeEventListener('focus', handleFocus);
        child.removeEventListener('blur', handleBlur);
        child.removeEventListener('input', handleInput);
      };
    }, []);

    // Clone the child element to add a ref
    const enhancedChild = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === 'textarea') {
        return React.cloneElement(child, {
          ref: (node: HTMLTextAreaElement) => {
            childRef.current = node;
            // Forward ref if the original child had one
            if (typeof child.ref === 'function') {
              child.ref(node);
            } else if (child.ref) {
              (child.ref as React.MutableRefObject<HTMLTextAreaElement>).current = node;
            }
          },
          className: cn(
            child.props.className,
            isFocused || hasContent ? 'border-primary' : 'border-transparent',
            'transition-all duration-200'
          ),
        });
      }
      return child;
    });

    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        {...props}
      >
        {enhancedChild}
      </div>
    );
  }
);

VanishInput.displayName = 'VanishInput';
