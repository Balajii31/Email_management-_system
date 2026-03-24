'use client';

import React, { useState } from "react";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Inbox, AlertCircle, Send, FileText, Settings, Mail, Star, Trash2,
  Users, CreditCard, Briefcase, CalendarDays, User, Bell, Megaphone, ChevronDown, ChevronRight, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComposeDialog } from './compose-dialog';

const categoryItems = [
  { label: 'Social', icon: <Users className="h-4 w-4 text-blue-500" />, folder: 'social' },
  { label: 'Updates', icon: <Bell className="h-4 w-4 text-cyan-500" />, folder: 'updates' },
  { label: 'Promotional', icon: <Megaphone className="h-4 w-4 text-red-500" />, folder: 'promotional' },
  { label: 'Events', icon: <CalendarDays className="h-4 w-4 text-orange-500" />, folder: 'events' },
  { label: 'Personal', icon: <User className="h-4 w-4 text-pink-500" />, folder: 'personal' },
  { label: 'Jobs', icon: <Briefcase className="h-4 w-4 text-purple-500" />, folder: 'jobs' },
];

const otherFolders = [
  { label: 'Sent', icon: <Send className="h-4 w-4" />, folder: 'sent' },
  { label: 'Drafts', icon: <FileText className="h-4 w-4" />, folder: 'drafts' },
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
      <aside className="w-64 hidden md:flex flex-col border-r border-border bg-card/50">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">AI Email</span>
          </div>
          
          <Button 
            className="w-full gap-2 shadow-sm" 
            size="lg"
            onClick={() => setComposeOpen(true)}
          >
            <Edit className="h-4 w-4" />
            Compose
          </Button>
        </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {/* Inbox */}
        <Link
          href="/inbox?folder=inbox"
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all group",
            currentFolder === 'inbox'
              ? "bg-primary/10 text-primary font-semibold shadow-sm" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <Inbox className={cn(
              "h-4 w-4 transition-colors",
              currentFolder === 'inbox' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span>Inbox</span>
          </div>
        </Link>

        {/* Important with Categories */}
        <div className="space-y-1">
          <button
            onClick={() => setIsImportantExpanded(!isImportantExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all group",
              isCategoryActive
                ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Star className={cn(
                "h-4 w-4 transition-colors",
                isCategoryActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span>Important</span>
            </div>
            {isImportantExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Category Filters */}
          {isImportantExpanded && (
            <div className="ml-6 space-y-0.5 border-l border-border pl-2">
              {categoryItems.map((item) => {
                const isActive = currentFolder === item.folder;
                return (
                  <Link
                    key={item.folder}
                    href={`/inbox?folder=${item.folder}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all group",
                      isActive 
                        ? "bg-primary/5 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Spam */}
        <Link
          href="/inbox?folder=spam"
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all group",
            currentFolder === 'spam'
              ? "bg-primary/10 text-primary font-semibold shadow-sm" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className={cn(
              "h-4 w-4 transition-colors",
              currentFolder === 'spam' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span>Spam</span>
          </div>
        </Link>

        <div className="h-px bg-border my-2" />

        {/* Other Folders */}
        {otherFolders.map((item) => {
          const isActive = currentFolder === item.folder;
          return (
            <Link
              key={item.folder}
              href={`/inbox?folder=${item.folder}`}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all group",
                isActive 
                  ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Settings className="h-4 w-4" />
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
