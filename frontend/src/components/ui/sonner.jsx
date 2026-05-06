'use client';

import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }) => {
  // Check if dark mode is active by reading the document class or local storage
  const [theme, setTheme] = React.useState('light');

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('kommerze-theme') === 'dark';
    setTheme(isDark ? 'dark' : 'light');

    // Optional: add a mutation observer to listen for class changes on documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const currentlyDark = document.documentElement.classList.contains('dark');
          setTheme(currentlyDark ? 'dark' : 'light');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="group toaster [&_[data-type=success]>[data-icon]]:text-success [&_[data-type=success]_[data-title]]:text-success [&_[data-type=info]_[data-title]]:text-info [&_[data-type=error]>[data-icon]]:text-destructive [&_[data-type=error]_[data-title]]:text-destructive"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground! group-[.toaster]:border-border group-[.toaster]:shadow-lg has-[[role=alert]]:border-0! has-[[role=alert]]:shadow-none! has-[[role=alert]]:bg-transparent!',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-primary group-[.toast]:text-primary-foreground!',
          cancelButton:
            'group-[.toast]:rounded-md! group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
