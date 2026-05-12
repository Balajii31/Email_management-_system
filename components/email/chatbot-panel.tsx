'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Sparkles, X } from 'lucide-react';

type Citation = {
  id: string;
  subject: string;
  from: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
};

interface ChatbotPanelProps {
  selectedEmailId?: string | null;
  onClose: () => void;
  onOpenEmail?: (emailId: string) => void;
}

const STARTER_PROMPTS = [
  'Summarize unread high-priority emails',
  'Find emails about invoices and payments',
  'What needs action today?',
];

export default function ChatbotPanel({ selectedEmailId, onClose, onOpenEmail }: ChatbotPanelProps) {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'I can help you summarize emails, find important threads, and draft response ideas. Ask a question to start.',
    },
  ]);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          selectedEmailId: selectedEmailId || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Chat request failed');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload.data?.answer || 'No response generated.',
        citations: payload.data?.citations || [],
      };

      if (payload.data?.sessionId) {
        setSessionId(payload.data.sessionId);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallbackText = error instanceof Error ? error.message : 'Unable to send message.';
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: `Chatbot error: ${fallbackText}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Email Assistant</p>
            <p className="text-xs text-muted-foreground">Ask about your inbox</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b border-border px-4 py-2">
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => sendMessage(prompt)}
              disabled={isSending}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3 pb-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[90%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-foreground'
                }
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      <Sparkles className="mr-1 h-3 w-3" /> Based on emails
                    </Badge>
                    <div className="flex flex-wrap gap-1.5">
                      {message.citations.map((citation) => (
                        <button
                          key={`${message.id}-${citation.id}`}
                          type="button"
                          onClick={() => onOpenEmail?.(citation.id)}
                          className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                          title={`${citation.subject} • ${citation.from}`}
                        >
                          {citation.subject || '(No Subject)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={selectedEmailId ? 'Ask about the selected email or your inbox...' : 'Ask about your inbox...'}
            className="min-h-[90px]"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Enter to send, Shift+Enter for new line</p>
            <Button
              type="submit"
              size="sm"
              disabled={!canSend}
              onClick={(event) => {
                if (!canSend) event.preventDefault();
              }}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
