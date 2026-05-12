'use client';

import { Email } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { 
  Paperclip, 
  ChevronLeft,
  Clock,
  Printer,
  ChevronDown,
  Reply,
  ReplyAll,
  Share,
  MoreHorizontal,
  Mail
} from 'lucide-react';
import { EmailSummary } from './email-summary';
import { EmailActions } from './email-actions';
import { ComposeDialog } from './compose-dialog';
import DOMPurify from 'dompurify';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailDetailProps {
  email: Email;
  onUpdate?: () => void;
  onClose?: () => void;
}

export default function EmailDetail({ email, onUpdate, onClose }: EmailDetailProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyAll, setReplyAll] = useState(false);
  
  const sanitizedBody = useMemo(() => {
    return typeof window !== 'undefined' ? DOMPurify.sanitize(email.body) : email.body;
  }, [email.body]);

  const date = new Date(email.createdAt);
  const fromName = email.from.split('<')[0].replace(/"/g, '').trim() || email.from;
  const fromEmail = email.from.includes('<') ? email.from.match(/<([^>]+)>/)?.[1] : email.from;
  const initial = fromName.charAt(0).toUpperCase() || '?';

  const handleReply = () => {
    setReplyAll(false);
    setReplyOpen(true);
  };

  const handleReplyAll = () => {
    setReplyAll(true);
    setReplyOpen(true);
  };

  return (
    <div className="flex h-full flex-col bg-background relative z-10 page-fade-in custom-scrollbar overflow-y-auto">
      {/* Detail Toolbar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border/30 sticky top-0 bg-background/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 lg:hidden rounded-lg">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-px w-4 bg-border/40 rotate-90 hidden lg:block mx-1" />
          <EmailActions emailId={email.id} isRead={email.isRead} onUpdate={onUpdate} />
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100 transition-opacity">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100 transition-opacity">
            <Share className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-40 hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-2xl border-border/40 backdrop-blur-xl">
              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer font-medium text-xs">Mark as Unread</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer font-medium text-xs">Mute Conversation</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg py-2 cursor-pointer font-medium text-xs text-destructive focus:bg-destructive/10">Delete Thread</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 px-8 py-10">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Hero Section: Subject & Sender */}
          <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              {email.subject || '(No Subject)'}
            </h1>
            
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-background ring-1 ring-border shadow-md">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fromName}&backgroundColor=6366f1&fontFamily=Inter&fontWeight=700`} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initial}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-tight text-foreground">{fromName}</span>
                    <span className="text-xs text-muted-foreground/60 font-medium tracking-tight whitespace-nowrap hidden sm:inline-block">
                      &lt;{fromEmail}&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium">
                    <span>to</span>
                    <span className="border-b border-muted transition-colors hover:border-muted-foreground/40 cursor-help" title={email.to.join(', ')}>
                      {email.to[0].split('@')[0]}
                      {email.to.length > 1 && ` +${email.to.length - 1} others`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  <Clock className="h-3 w-3" />
                  <span>{format(date, 'MMM d, h:mm a')}</span>
                </div>
                <Badge variant="secondary" className="text-[9px] h-4.5 px-1.5 uppercase font-bold tracking-tighter opacity-50">
                  Via {email.from.includes('gmail.com') ? 'Gmail' : 'SMTP'}
                </Badge>
              </div>
            </div>
          </div>

          {/* AI Intelligence Layer */}
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
            <EmailSummary 
              emailId={email.id} 
              initialSummary={email.summaries?.[0]?.content} 
            />
          </div>

          {/* Email Interaction Bar */}
          <div className="flex items-center gap-3 pt-2">
            <Button 
              onClick={handleReply}
              className="px-6 rounded-xl gap-2 font-bold text-xs h-10 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReplyAll}
              className="px-6 rounded-xl gap-2 font-bold text-xs h-10 border-border/40 hover:bg-muted/50 transition-all active:scale-95"
            >
              <ReplyAll className="h-3.5 w-3.5" />
              Reply All
            </Button>
          </div>

          {/* Message Body - Refined Prose */}
          <div className="relative pt-6">
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-foreground/80">
              <div 
                className="email-content text-sm leading-relaxed whitespace-pre-wrap font-medium text-foreground/80 selection:bg-primary/20"
                dangerouslySetInnerHTML={{ __html: sanitizedBody }}
              />
            </div>
          </div>

          {/* Attachments Section - Modern Cards */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="space-y-4 pt-12 border-t border-border/30">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                  <Paperclip className="h-3 w-3" />
                  Attachments ({email.attachments.length})
                </h3>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary">Download All</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-12">
                {email.attachments.map((file) => (
                  <Card key={file.id} className="group border-border/30 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 active:translate-y-0">
                    <CardContent className="p-4 flex items-center gap-4 bg-muted/10 group-hover:bg-background transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate tracking-tight">{file.filename}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-medium">{(file.size / 1024).toFixed(1)} KB • {file.filename.split('.').pop()?.toUpperCase()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ComposeDialog 
        open={replyOpen}
        onOpenChange={setReplyOpen}
        defaultTo={replyAll ? [fromEmail, ...email.to, ...(email.cc || [])].filter(e => e !== fromEmail).join(', ') : fromEmail || ''}
        defaultSubject={email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`}
        defaultBody={`\n\n\nOn ${format(date, 'MMM d, yyyy \'at\' h:mm a')}, ${fromName} wrote:\n${email.body.split('\n').map(line => '> ' + line).join('\n')}`}
      />
    </div>
  );
}
