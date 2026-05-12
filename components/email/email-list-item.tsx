'use client';

import { Email } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
}

export function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const date = new Date(email.createdAt);
  const senderName = email.from.split('<')[0].replace(/"/g, '').trim() || email.from;
  const initial = senderName.charAt(0).toUpperCase() || '?';
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-3 p-5 transition-all duration-300 cursor-pointer border-b border-border/30",
        isSelected && "bg-primary/[0.03] shadow-[inset_4px_0_0_0_theme(colors.primary.DEFAULT)]",
        !isSelected && "hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 border border-border/40 shrink-0">
            <AvatarFallback className={cn(
              "text-[10px] font-bold uppercase",
              !email.isRead ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/60"
            )}>
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 ">
              <span className={cn(
                "text-[13px] tracking-tight truncate transition-colors",
                !email.isRead ? "text-foreground font-bold" : "text-foreground/60 font-medium"
              )}>
                {senderName}
              </span>
              {!email.isRead && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <time className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">
              {formatDistanceToNow(date, { addSuffix: false })} ago
            </time>
          </div>
        </div>
        
        {email.priority && (
          <div className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0 mt-2",
            email.priority === 'high' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
            email.priority === 'medium' ? "bg-amber-500" : "bg-slate-300"
          )} title={`${email.priority} priority`} />
        )}
      </div>

      <div className="flex flex-col gap-1 pr-2">
        <h4 className={cn(
          "text-[13px] line-clamp-1 tracking-tight",
          !email.isRead ? "text-foreground/90 font-bold" : "text-foreground/70 font-medium"
        )}>
          {email.subject || '(No Subject)'}
        </h4>
        <p className="text-[12px] text-muted-foreground/60 line-clamp-2 leading-relaxed font-normal">
          {email.body.substring(0, 200).replace(/<[^>]*>?/gm, '').trim()}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {email.isSpam && (
          <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 uppercase font-bold text-orange-600 bg-orange-500/5 border-orange-500/10">
            Spam Detected
          </Badge>
        )}
        {email.category && email.category !== 'personal' && (
          <Badge variant="secondary" className="text-[9px] h-4.5 px-1.5 uppercase font-bold tracking-wider opacity-60">
            {email.category}
          </Badge>
        )}
      </div>
    </div>
  );
}
