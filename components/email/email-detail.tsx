'use client';

import { Email } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { 
  Paperclip, 
  ChevronLeft,
  User,
  Clock,
  Printer,
  ChevronDown
} from 'lucide-react';
import { EmailSummary } from './email-summary';
import { EmailActions } from './email-actions';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmailDetailProps {
  email: Email;
  onUpdate?: () => void;
  onClose?: () => void;
}

export default function EmailDetail({ email, onUpdate, onClose }: EmailDetailProps) {
  const sanitizedBody = useMemo(() => {
    return typeof window !== 'undefined' ? DOMPurify.sanitize(email.body) : email.body;
  }, [email.body]);

  const date = new Date(email.createdAt);
  const fromName = email.from.split('<')[0].replace(/"/g, '').trim() || email.from;
  const fromEmail = email.from.includes('<') ? email.from.match(/<([^>]+)>/)?.[1] : email.from;

  return (
    <div className="flex h-full flex-col bg-background animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Detail Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <EmailActions emailId={email.id} isRead={email.isRead} onUpdate={onUpdate} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Print">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Subject & Meta */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {email.subject || '(No Subject)'}
            </h1>
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border shadow-sm">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fromName}`} />
                  <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{fromName}</span>
                    <span className="text-xs text-muted-foreground">&lt;{fromEmail}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>to {email.to.join(', ')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(date, 'MMM d, yyyy, h:mm a')}</span>
              </div>
            </div>
          </div>

          <EmailSummary 
            emailId={email.id} 
            initialSummary={email.summaries?.[0]?.content} 
          />

          {/* Body Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div 
              className="email-content text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
            />
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="space-y-3 pt-8 border-t border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({email.attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {email.attachments.map((file) => (
                  <Card key={file.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <Paperclip className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{file.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
