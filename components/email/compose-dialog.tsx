'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Send, X } from 'lucide-react';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

export function ComposeDialog({ open, onOpenChange, defaultTo = '', defaultSubject = '', defaultBody = '' }: ComposeDialogProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Please enter a recipient');
      return;
    }

    try {
      setIsSending(true);
      await apiClient.post('/api/emails/send', {
        to: to.split(',').map(email => email.trim()),
        subject: subject.trim() || '(No Subject)',
        body: body.trim(),
      });

      toast.success('Email sent successfully!');
      
      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (to || subject || body) {
      if (confirm('Discard draft?')) {
        setTo('');
        setSubject('');
        setBody('');
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Create and send a new email message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple recipients with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSending}
              rows={12}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !to.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
