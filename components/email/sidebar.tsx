'use client';

import React from "react";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Inbox, AlertCircle, Send, FileText, Settings, Mail, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const folderItems = [
  { label: 'Inbox', icon: <Inbox className="h-4 w-4" />, folder: 'inbox' },
  { label: 'High Priority', icon: <Star className="h-4 w-4 text-amber-500" />, folder: 'high-priority' },
  { label: 'Spam', icon: <AlertCircle className="h-4 w-4" />, folder: 'spam' },
  { label: 'Sent', icon: <Send className="h-4 w-4" />, folder: 'sent' },
  { label: 'Drafts', icon: <FileText className="h-4 w-4" />, folder: 'drafts' },
  { label: 'Trash', icon: <Trash2 className="h-4 w-4" />, folder: 'trash' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFolder = searchParams.get('folder') || 'inbox';

  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-border bg-card/50">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">AI Email</span>
        </div>
        
        <Button className="w-full gap-2 shadow-sm" size="lg">
          <Mail className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {folderItems.map((item) => {
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
  );
}
