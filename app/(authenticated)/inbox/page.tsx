'use client';

import { Suspense, useEffect, useState } from 'react';
import EmailList from '@/components/email/email-list';
import EmailDetail from '@/components/email/email-detail';
import { useEmails } from '@/hooks/useEmails';
import { useEmailDetail } from '@/hooks/useEmailDetail';
import { useSelection } from '@/components/providers';
import { useSearchParams } from 'next/navigation';

export default function InboxPage() {
  const searchParams = useSearchParams();
  const folder = searchParams.get('folder') || 'inbox';
  const search = searchParams.get('search') || undefined;
  const { selectedEmailId, setSelectedEmailId } = useSelection();
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  
  const { emails, isLoading, mutate: mutateList } = useEmails({ folder, search });
  const { email, isLoading: isLoadingDetail, mutate: mutateDetail } = useEmailDetail(selectedEmailId);

  // Auto-refresh emails every 5 minutes
  useEffect(() => {
    const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    const autoRefresh = async () => {
      setIsAutoSyncing(true);
      await mutateList();
      setTimeout(() => setIsAutoSyncing(false), 1000);
    };

    const interval = setInterval(autoRefresh, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [mutateList]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'j') {
        // Next email
        const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
        if (currentIndex < emails.length - 1) {
          setSelectedEmailId(emails[currentIndex + 1].id);
        }
      } else if (e.key === 'k') {
        // Previous email
        const currentIndex = emails.findIndex(e => e.id === selectedEmailId);
        if (currentIndex > 0) {
          setSelectedEmailId(emails[currentIndex - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedEmailId, setSelectedEmailId]);

  // If no email is selected, and on desktop, select the first one
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
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Auto-sync indicator */}
      {isAutoSyncing && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-primary">
          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Refreshing emails...
        </div>
      )}
      
      {/* Email List Section */}
      <div className={`w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col border-r border-border bg-card ${selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
        <EmailList 
          emails={emails} 
          selectedEmailId={selectedEmailId || undefined} 
          onEmailSelect={(email) => setSelectedEmailId(email.id)}
          isLoading={isLoading}
          folder={folder}
        />
      </div>

      {/* Email Detail Section */}
      <div className={`flex-1 min-w-0 bg-background ${!selectedEmailId ? 'hidden lg:flex' : 'flex'} flex-col`}>
        {selectedEmailId ? (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading email...</div>}>
            {email && (
              <EmailDetail 
                email={email} 
                onUpdate={handleUpdate}
                onClose={() => setSelectedEmailId(null)}
              />
            )}
            {!email && !isLoadingDetail && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Email not found.
              </div>
            )}
          </Suspense>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="rounded-full bg-muted p-6 mb-4">
              <svg className="h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Select an email to read</h2>
            <p className="max-w-[280px] mt-2 text-sm">Choose an email from the list on the left to see its content and AI summary.</p>
          </div>
        )}
      </div>
    </div>
  );
}
