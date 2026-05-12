'use client';

import { useMemo } from 'react';
import { Email, Priority } from '@/lib/types';
import { EmailListItem } from './email-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailSelect: (email: Email) => void;
  isLoading?: boolean;
  folder?: string;
}

export default function EmailList({ 
  emails, 
  selectedEmailId, 
  onEmailSelect,
  isLoading,
  folder = 'inbox'
}: EmailListProps) {
  const shouldGroupByPriority = folder === 'inbox';

  const groupedEmails = useMemo(() => {
    if (!shouldGroupByPriority) return [];
    const high = emails.filter(e => e.priority === 'high');
    const medium = emails.filter(e => e.priority === 'medium');
    const low = emails.filter(e => e.priority === 'low');
    
    return [
      { priority: 'high' as const, label: 'High Priority', emails: high },
      { priority: 'medium' as const, label: 'Medium Priority', emails: medium },
      { priority: 'low' as const, label: 'Everyone Else', emails: low },
    ].filter(group => group.emails.length > 0);
  }, [emails, shouldGroupByPriority]);

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex flex-col p-6 gap-8 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md opacity-40" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[200px]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/30">
          No Conversations Found
        </h3>
      </div>
    );
  }

  const ListContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col divide-y divide-border/20">
      {children}
    </div>
  );

  if (!shouldGroupByPriority) {
    return (
      <ListContainer>
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onClick={() => onEmailSelect(email)}
          />
        ))}
      </ListContainer>
    );
  }

  return (
    <div className="flex flex-col">
      {groupedEmails.map((group) => (
        <div key={group.priority} className="flex flex-col">
          <div className="sticky top-0 z-20 h-9 flex items-center bg-background/80 backdrop-blur-xl px-5 border-b border-border/30">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em]",
              group.priority === 'high' ? "text-primary/70" : "text-muted-foreground/50"
            )}>
              {group.label}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-border/20">
            {group.emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                onClick={() => onEmailSelect(email)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
