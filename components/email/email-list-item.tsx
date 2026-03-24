'use client';

import { Email } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Mail, MailOpen } from 'lucide-react';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
}

export function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const date = new Date(email.createdAt);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-1 border-b border-border p-4 transition-colors hover:bg-muted/50 cursor-pointer",
        isSelected && "bg-muted",
        !email.isRead && "bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!email.isRead && (
            <span className="flex h-2 w-2 rounded-full bg-primary" />
          )}
          <span className={cn(
            "text-sm font-medium transition-colors truncate",
            !email.isRead ? "text-foreground font-semibold" : "text-muted-foreground"
          )}>
            {email.from.split('<')[0].replace(/"/g, '').trim() || email.from}
          </span>
        </div>
        <time className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(date, { addSuffix: false })}
        </time>
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className={cn(
          "text-sm line-clamp-1",
          !email.isRead ? "text-foreground font-semibold" : "text-muted-foreground"
        )}>
          {email.subject || '(No Subject)'}
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {email.body.substring(0, 300).replace(/<[^>]*>?/gm, '').trim()}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {email.isSpam && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase font-bold text-orange-500 border-orange-500/20">Spam</Badge>
        )}
      </div>
    </div>
  );
}
