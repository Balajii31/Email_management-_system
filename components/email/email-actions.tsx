'use client';

import { Button } from '@/components/ui/button';
import { 
  Archive, 
  Trash2, 
  Mail, 
  MailOpen, 
  MoreVertical,
  Reply,
  Forward,
  Star
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface EmailActionsProps {
  emailId: string;
  isRead?: boolean;
  onUpdate?: () => void;
}

export function EmailActions({ emailId, isRead, onUpdate }: EmailActionsProps) {
  const handleToggleRead = async () => {
    try {
      await apiClient.patch(`/api/emails/${emailId}`, { isRead: !isRead });
      toast.success(isRead ? 'Marked as unread' : 'Marked as read');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Failed to update email');
    }
  };

  const handleArchive = async () => {
    try {
      await apiClient.patch(`/api/emails/${emailId}`, { isArchived: true });
      toast.success('Email archived');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Failed to archive email');
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/api/emails/${emailId}`);
      toast.success('Email moved to trash');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Failed to delete email');
    }
  };

  const handleMarkSpam = async () => {
    try {
      await apiClient.patch(`/api/emails/${emailId}`, { isSpam: true, folder: 'spam' });
      toast.success('Email marked as spam');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Failed to mark as spam');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={handleToggleRead} title={isRead ? "Mark as unread" : "Mark as read"}>
        {isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleArchive} title="Archive">
        <Archive className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" title="Reply">
        <Reply className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Forward">
        <Forward className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2">
            <Star className="h-4 w-4" /> Mark as favorite
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-destructive" onClick={handleMarkSpam}>
            <Trash2 className="h-4 w-4" /> Report spam
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
