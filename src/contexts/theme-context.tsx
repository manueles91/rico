'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Check if localStorage is available (client-side)
    if (typeof window !== 'undefined') {
      // Try to get theme from localStorage
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // If no theme in localStorage, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
      setMounted(true);
    }
  }, []);

  // Force an immediate update of the document class when theme changes or on mount
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Force style recalculation by removing both classes first
    root.classList.remove('light', 'dark');
    
    // Add a small delay before adding the new class to ensure the removal has taken effect
    setTimeout(() => {
      root.classList.add(theme);
      // Save to localStorage
      localStorage.setItem('theme', theme);
      
      // Apply a data attribute as a backup
      root.setAttribute('data-theme', theme);
      
      // Explicitly add background color class
      document.body.className = document.body.className
        .replace(/bg-\S+/g, '')
        .concat(` bg-background text-foreground`);
    }, 10);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Avoid rendering with incorrect theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
