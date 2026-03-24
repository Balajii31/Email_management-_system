'use client';

import { Search, RotateCw, LogOut, User, MailCheck, Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useAuth } from '@/components/providers';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

type SyncStartResponse = {
  data: { jobId: string };
  message?: string;
};

type SyncStatusResponse = {
  data: {
    id: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    totalSynced: number;
    error?: string | null;
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSyncResult(jobId: string): Promise<SyncStatusResponse['data']> {
  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await apiClient.get<SyncStatusResponse>(`/api/emails/sync/status?jobId=${encodeURIComponent(jobId)}`);

    if (status.data.status === 'COMPLETED' || status.data.status === 'FAILED') {
      return status.data;
    }

    await delay(1500);
  }

  throw new Error('Sync is still processing. Please check again in a moment.');
}

export default function TopNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await apiClient.post<SyncStartResponse>('/api/emails/sync');
      toast.success('Sync started. Checking status...');

      const result = await waitForSyncResult(res.data.jobId);

      if (result.status === 'FAILED') {
        const message = result.error || 'Sync failed';
        if (
          message.toLowerCase().includes('invalid_grant') ||
          message.toLowerCase().includes('google') ||
          message.toLowerCase().includes('insufficient authentication scopes')
        ) {
          toast.error('Gmail connection expired. Please reconnect your account.');
          window.location.href = '/api/auth/gmail-connect';
          return;
        }

        toast.error(message);
        return;
      }

      toast.success(`Sync completed. ${result.totalSynced} new email(s) added.`);
      window.location.reload();
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (
        message.includes('google') ||
        message.includes('invalid_grant') ||
        message.includes('insufficient authentication scopes')
      ) {
        window.location.href = '/api/auth/gmail-connect';
      } else {
        toast.error(error.message || 'Sync failed');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const folder = searchParams.get('folder') || 'inbox';
    if (searchQuery.trim()) {
      router.push(`/inbox?folder=${folder}&search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/inbox?folder=${folder}`);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    const folder = searchParams.get('folder') || 'inbox';
    router.push(`/inbox?folder=${folder}`);
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <form onSubmit={handleSearch} className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          title="Sync with Gmail"
          onClick={handleSync}
          disabled={isSyncing}
          className={isSyncing ? 'animate-spin' : ''}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border-2 border-background" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/api/auth/gmail-connect'}>
              <MailCheck className="mr-2 h-4 w-4" />
              <span>Connect Gmail</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
