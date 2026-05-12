'use client';

import { Search, RotateCw, LogOut, User, MailCheck, Bell, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [dbProfile, setDbProfile] = useState<{ avatar?: string; name?: string } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get<any>('/api/user/profile');
        if (res.data) setDbProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }
    if (user) fetchProfile();
  }, [user]);

  const avatarUrl = useMemo(() => {
    if (dbProfile?.avatar) return dbProfile.avatar;
    const metadata = user?.user_metadata as Record<string, any> | undefined;
    return metadata?.avatar_url || metadata?.picture || '';
  }, [user?.user_metadata, dbProfile?.avatar]);

  const avatarInitial = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, any> | undefined;
    const name = String(dbProfile?.name || metadata?.full_name || metadata?.name || user?.email || '').trim();
    return name ? name.charAt(0).toUpperCase() : 'U';
  }, [user?.user_metadata, user?.email, dbProfile?.name]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await apiClient.post<SyncStartResponse>('/api/emails/sync');
      toast.promise(waitForSyncResult(res.data.jobId), {
        loading: 'Syncing your emails...',
        success: (result) => {
          if (result.status === 'FAILED') throw new Error(result.error || 'Sync failed');
          return `Sync completed. ${result.totalSynced} new email(s) added.`;
        },
        error: (err) => err.message || 'Sync failed'
      });
    } catch (error: any) {
      toast.error(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const folder = searchParams.get('folder') || 'inbox';
    router.push(`/inbox?folder=${folder}${searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  return (
    <header className={cn(
      "h-16 border-b border-border/50 sticky top-0 z-30 transition-all duration-300",
      isScrolled ? "bg-background/80 backdrop-blur-xl shadow-sm" : "bg-transparent"
    )}>
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          
          <form onSubmit={handleSearch} className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-10 h-10 w-full bg-muted/40 border-transparent hover:bg-muted/60 focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all duration-200 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-background/80 text-muted-foreground/40 hover:text-foreground transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </form>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              "h-9 w-9 rounded-lg hover:bg-primary/5 hover:text-primary transition-all active:scale-95",
              isSyncing && "animate-spin text-primary"
            )}
            title="Refresh Inbox"
          >
            <RotateCw className="h-[18px] w-[18px]" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-primary/5 hover:text-primary transition-all relative group">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-primary border-[1.5px] border-background group-hover:animate-pulse" />
          </Button>

          <div className="w-px h-5 bg-border/40 mx-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1 p-0 hover:ring-4 hover:ring-primary/10 transition-all duration-300">
                <Avatar className="h-9 w-9 border border-border/50">
                  <AvatarImage 
                    src={avatarUrl} 
                    alt={dbProfile?.name || "User"} 
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold uppercase">
                    {avatarInitial}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-border/40 backdrop-blur-xl">
              <div className="flex items-center gap-3 p-3 leading-none">
                <Avatar className="h-10 w-10 border border-border/40 ring-1 ring-black/5">
                  <AvatarImage src={avatarUrl} alt={dbProfile?.name || "User"} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">{avatarInitial}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold tracking-tight">{dbProfile?.name || user?.user_metadata?.full_name || 'User Account'}</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="my-1 opacity-40" />
              <DropdownMenuItem onClick={() => router.push('/profile')} className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5 px-3">
                <User className="mr-2.5 h-4 w-4 opacity-70" />
                <span className="font-medium text-xs">View Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/api/auth/gmail-connect'} className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5 px-3">
                <MailCheck className="mr-2.5 h-4 w-4 opacity-70" />
                <span className="font-medium text-xs">Switch Account</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 opacity-40" />
              <DropdownMenuItem onClick={() => signOut()} className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors cursor-pointer py-2.5 px-3">
                <LogOut className="mr-2.5 h-4 w-4 opacity-70" />
                <span className="font-medium text-xs">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
