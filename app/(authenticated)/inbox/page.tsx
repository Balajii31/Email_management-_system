'use client';

import { Suspense, useEffect, useState } from 'react';
import EmailList from '@/components/email/email-list';
import EmailDetail from '@/components/email/email-detail';
import { useEmails } from '@/hooks/useEmails';
import { useEmailDetail } from '@/hooks/useEmailDetail';
import { useSelection } from '@/components/providers';
import { useSearchParams } from 'next/navigation';
import ChatbotPanel from '@/components/email/chatbot-panel';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, MoreVertical, LayoutGrid, SlidersHorizontal, Inbox as InboxIcon } from 'lucide-react';
import { Email } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function InboxPage() {
  const searchParams = useSearchParams();
  const folder = searchParams.get('folder') || 'inbox';
  const search = searchParams.get('search') || undefined;
  const { selectedEmailId, setSelectedEmailId } = useSelection();
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
  
  const { emails, isLoading, mutate: mutateList } = useEmails({ folder, search });
  const { email, isLoading: isLoadingDetail, isError: detailError, mutate: mutateDetail } = useEmailDetail(selectedEmailId);

  useEffect(() => {
    const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
    const autoRefresh = async () => {
      setIsAutoSyncing(true);
      await mutateList();
      setTimeout(() => setIsAutoSyncing(false), 1000);
    };
    const interval = setInterval(autoRefresh, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [mutateList]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'j') {
        const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
        if (currentIndex < emails.length - 1) setSelectedEmailId(emails[currentIndex + 1].id);
      } else if (e.key === 'k') {
        const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
        if (currentIndex > 0) setSelectedEmailId(emails[currentIndex - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedEmailId, setSelectedEmailId]);

  useEffect(() => {
    if (!selectedEmailId && emails.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSelectedEmailId(emails[0].id);
    }
  }, [emails, selectedEmailId, setSelectedEmailId]);

  const handleUpdate = () => {
    mutateList();
    mutateDetail();
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative bg-background page-fade-in transition-all duration-500">
      {/* Auto-sync indicator - Refined floating notification */}
      {isAutoSyncing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] py-2 px-4 bg-primary text-primary-foreground text-[11px] font-bold rounded-full shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-full duration-300 ring-1 ring-white/20">
          <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Updating your Inbox...
        </div>
      )}
      
      {/* Email List Section - Professional Slate Palette */}
      <div className={cn(
        "w-full lg:w-[400px] xl:w-[460px] flex-shrink-0 flex flex-col border-r border-border/40 bg-background/50 backdrop-blur-sm relative transition-all duration-300",
        selectedEmailId ? 'hidden lg:flex' : 'flex'
      )}>
        {/* List Header/Sub-toolbar */}
        <div className="h-14 px-5 border-b border-border/30 flex items-center justify-between">
          <h1 className="text-sm font-bold tracking-tight capitalize flex items-center gap-2">
            {folder}
            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {emails.length}
            </span>
          </h1>
          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <EmailList 
            emails={emails} 
            selectedEmailId={selectedEmailId || undefined} 
            onEmailSelect={(email) => {
              setPreviewEmail(email);
              setSelectedEmailId(email.id);
            }}
            isLoading={isLoading}
            folder={folder}
          />
        </div>
      </div>

      {/* Email Detail Section - Canvas-style whitespace */}
      <div className={cn(
        "flex-1 min-w-0 bg-background/95 relative",
        !selectedEmailId ? 'hidden lg:flex' : 'flex',
        "flex-col transition-all duration-300"
      )}>
        {selectedEmailId ? (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center font-medium text-sm text-muted-foreground">Preparing conversation...</div>}>
            {email && (
              <div className="flex-1 h-full page-fade-in relative z-10">
                <EmailDetail 
                  email={email} 
                  onUpdate={handleUpdate}
                  onClose={() => setSelectedEmailId(null)}
                />
              </div>
            )}
            {!email && isLoadingDetail && (
              previewEmail ? (
                <div className="flex-1 h-full opacity-60 page-fade-in">
                  <EmailDetail
                    email={previewEmail}
                    onUpdate={handleUpdate}
                    onClose={() => setSelectedEmailId(null)}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
                  <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground/50">Fetching Details</span>
                </div>
              )
            )}
            {!email && !isLoadingDetail && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-12 max-w-md mx-auto">
                <div className="h-16 w-16 rounded-3xl bg-destructive/5 flex items-center justify-center ring-1 ring-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive/40" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold">Unable to retrieve message</h3>
                  <p className="text-xs text-muted-foreground leading-loose">
                    {detailError?.message || 'This conversation is currently unavailable. It may have been deleted or the connection was lost.'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => mutateDetail()} className="rounded-full px-6 text-xs h-9">
                  Retry Loading
                </Button>
              </div>
            )}
          </Suspense>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground/30 select-none">
            <div className="relative mb-6">
              <div className="h-24 w-24 rounded-[2.5rem] bg-gradient-to-br from-muted/40 to-muted/10 flex items-center justify-center ring-1 ring-border/50 shadow-inner">
                <InboxIcon strokeWidth={1} className="h-12 w-12" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-background">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="space-y-1 max-w-[280px]">
              <h2 className="text-sm font-bold text-foreground/40 tracking-tight">No conversation selected</h2>
              <p className="text-[11px] leading-relaxed">Pick a thread from your inbox to view the full message and AI-generated insights.</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chatbot Toggle - Design Refresh */}
      <div className="absolute bottom-6 right-6 z-50">
        <Button
          type="button"
          size="lg"
          className={cn(
            "h-12 px-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 transition-all duration-300 group",
            isChatOpen ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground hover:shadow-primary/30"
          )}
          onClick={() => setIsChatOpen((prev) => !prev)}
        >
          {isChatOpen ? (
            <div className="flex items-center gap-3">
              <MoreVertical className="h-4 w-4 rotate-90" />
              <span className="font-bold text-xs uppercase tracking-widest">Hide Assistant</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 group-hover:scale-125 transition-transform" />
              <span className="font-bold text-xs uppercase tracking-widest">Ask AI</span>
            </div>
          )}
        </Button>
      </div>

      {/* Assistant Sidebar */}
      {isChatOpen && (
        <div className="absolute inset-y-0 right-0 z-[60] w-full sm:w-[450px] animate-in slide-in-from-right duration-500 ease-out border-l border-border/40 bg-background/80 backdrop-blur-2xl shadow-2xl shadow-black/20">
          <ChatbotPanel
            selectedEmailId={selectedEmailId}
            onOpenEmail={(emailId) => setSelectedEmailId(emailId)}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
