'use client';

import { useMemo } from 'react';
import { Email, Priority } from '@/lib/types';
import { EmailListItem } from './email-list-item';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailSelect: (email: Email) => void;
  isLoading?: boolean;
  folder?: string;
}

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

export default function EmailList({ 
  emails, 
  selectedEmailId, 
  onEmailSelect,
  isLoading,
  folder = 'inbox'
}: EmailListProps) {
  // Only group by priority for inbox folder, not for spam or category folders
  const shouldGroupByPriority = folder === 'inbox';

  const groupedEmails = useMemo(() => {
    if (!shouldGroupByPriority) {
      return [];
    }
    const high = emails.filter(e => e.priority === 'high');
    const medium = emails.filter(e => e.priority === 'medium');
    const low = emails.filter(e => e.priority === 'low');
    
    return [
      { priority: 'high' as const, label: 'High Priority', emails: high },
      { priority: 'medium' as const, label: 'Medium Priority', emails: medium },
      { priority: 'low' as const, label: 'Low Priority', emails: low },
    ].filter(group => group.emails.length > 0);
  }, [emails, shouldGroupByPriority]);

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold">No emails</h3>
        <p className="text-xs text-muted-foreground mt-1">Your inbox is clear!</p>
      </div>
    );
  }

  // For spam and category folders, use simple rendering without priority groups
  if (!shouldGroupByPriority) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-y-auto w-full border-r border-border">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onClick={() => onEmailSelect(email)}
          />
        ))}
      </div>
    );
  }

  // For inbox, show emails grouped by priority
  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto w-full border-r border-border">
      {groupedEmails.map((group) => (
        <div key={group.priority}>
          <div className="flex h-8 items-center bg-muted/50 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border sticky top-0 z-10">
            {group.label}
          </div>
          {group.emails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              isSelected={selectedEmailId === email.id}
              onClick={() => onEmailSelect(email)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
