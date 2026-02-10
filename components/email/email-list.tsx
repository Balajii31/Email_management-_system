'use client';

import { useRef, useMemo } from 'react';
import { Email, Priority } from '@/lib/types';
import { EmailListItem } from './email-list-item';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  onEmailSelect: (email: Email) => void;
  isLoading?: boolean;
}

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

export default function EmailList({ 
  emails, 
  selectedEmailId, 
  onEmailSelect,
  isLoading 
}: EmailListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const groupedEmails = useMemo(() => {
    const high = emails.filter(e => e.priority === 'high');
    const medium = emails.filter(e => e.priority === 'medium');
    const low = emails.filter(e => e.priority === 'low');
    
    return [
      { priority: 'high' as const, label: 'High Priority', emails: high },
      { priority: 'medium' as const, label: 'Medium Priority', emails: medium },
      { priority: 'low' as const, label: 'Low Priority', emails: low },
    ].filter(group => group.emails.length > 0);
  }, [emails]);

  const flatList = useMemo(() => {
    const items: ({ type: 'header'; label: string } | { type: 'email'; email: Email })[] = [];
    groupedEmails.forEach(group => {
      items.push({ type: 'header', label: group.label });
      group.emails.forEach(email => {
        items.push({ type: 'email', email });
      });
    });
    return items;
  }, [groupedEmails]);

  const rowVirtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => flatList[index].type === 'header' ? 32 : 120,
    overscan: 5,
  });

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

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-64px)] overflow-y-auto w-full border-r border-border custom-scrollbar"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = flatList[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item.type === 'header' ? (
                <div className="flex h-8 items-center bg-muted/50 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  {item.label}
                </div>
              ) : (
                <EmailListItem
                  email={item.email}
                  isSelected={selectedEmailId === item.email.id}
                  onClick={() => onEmailSelect(item.email)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
