'use client';

import React, { useState } from "react";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Inbox, AlertCircle, Send, FileText, Settings, Mail, Star, Trash2,
  Users, Briefcase, CalendarDays, User, Bell, Megaphone, ChevronDown, ChevronRight, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComposeDialog } from './compose-dialog';

const categoryItems = [
  { label: 'Social', icon: <Users className="h-4 w-4" />, folder: 'social' },
  { label: 'Updates', icon: <Bell className="h-4 w-4" />, folder: 'updates' },
  { label: 'Promotional', icon: <Megaphone className="h-4 w-4" />, folder: 'promotional' },
  { label: 'Events', icon: <CalendarDays className="h-4 w-4" />, folder: 'events' },
  { label: 'Personal', icon: <User className="h-4 w-4" />, folder: 'personal' },
  { label: 'Jobs', icon: <Briefcase className="h-4 w-4" />, folder: 'jobs' },
];

const mainFolders = [
  { label: 'Inbox', icon: <Inbox className="h-4 w-4" />, folder: 'inbox' },
  { label: 'Sent', icon: <Send className="h-4 w-4" />, folder: 'sent' },
  { label: 'Drafts', icon: <FileText className="h-4 w-4" />, folder: 'drafts' },
  { label: 'Spam', icon: <AlertCircle className="h-4 w-4" />, folder: 'spam' },
  { label: 'Trash', icon: <Trash2 className="h-4 w-4" />, folder: 'trash' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFolder = searchParams.get('folder') || 'inbox';
  const [isImportantExpanded, setIsImportantExpanded] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const isCategoryActive = categoryItems.some(item => item.folder === currentFolder);

  return (
    <>
      <aside className="w-64 hidden md:flex flex-col border-r border-border/50 bg-sidebar-background/60 backdrop-blur-xl transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-8 px-1">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-primary/20">
              <Mail className="h-5 w-5 text-primary-foreground stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              Velocity Mail
            </span>
          </div>
          
          <Button 
            className="w-full gap-2 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 h-10 rounded-lg group" 
            onClick={() => setComposeOpen(true)}
          >
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-semibold">Compose</span>
          </Button>
        </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-1 py-2 text-muted-foreground/60 px-2 text-[10px] font-bold uppercase tracking-wider">
          Mailboxes
        </div>
        
        {mainFolders.map((folder) => {
          const isActive = currentFolder === folder.folder;
          return (
            <Link
              key={folder.folder}
              href={`/inbox?folder=${folder.folder}`}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ring-1 ring-primary/20" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "transition-all duration-200",
                  isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {folder.icon}
                </span>
                <span>{folder.label}</span>
              </div>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full shadow-sm" />
              )}
            </Link>
          );
        })}

        <div className="pt-6 pb-2">
          <button
            onClick={() => setIsImportantExpanded(!isImportantExpanded)}
            className="w-full flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors group"
          >
            <span>AI Smart Labels</span>
            {isImportantExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        </div>

        {isImportantExpanded && (
          <div className="space-y-0.5 mt-1">
            {categoryItems.map((item) => {
              const isActive = currentFolder === item.folder;
              return (
                <Link
                  key={item.folder}
                  href={`/inbox?folder=${item.folder}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 group",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] ring-1 ring-primary/20" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "transition-all duration-200",
                    isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border/30 mt-auto space-y-1">
        <Link
          href="/calendar"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
            pathname === '/calendar' 
              ? "bg-primary/10 text-primary font-medium" 
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <CalendarDays className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          <span>Scheduler</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
            pathname === '/settings' 
              ? "bg-primary/10 text-primary font-medium" 
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>

    <ComposeDialog 
      open={composeOpen} 
      onOpenChange={setComposeOpen}
    />
  </>
  );
}
