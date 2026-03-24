'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, Moon, Sun, Monitor, Mail, Shield, Zap, Database } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [spamFilter, setSpamFilter] = useState(true);

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application preferences and settings</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme">Theme</Label>
              <p className="text-sm text-muted-foreground">Select your preferred theme</p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email updates for important events</p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">Show desktop notifications for new emails</p>
            </div>
            <Switch
              id="desktop-notifications"
              checked={desktopNotifications}
              onCheckedChange={setDesktopNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </CardTitle>
          <CardDescription>Configure email sync and processing options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Auto Sync</Label>
              <p className="text-sm text-muted-foreground">Automatically sync emails in the background</p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="spam-filter">Spam Filter</Label>
              <p className="text-sm text-muted-foreground">Automatically detect and filter spam emails</p>
            </div>
            <Switch
              id="spam-filter"
              checked={spamFilter}
              onCheckedChange={setSpamFilter}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Sync Frequency</Label>
            <Select defaultValue="15">
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Features
          </CardTitle>
          <CardDescription>Configure AI-powered email classification and summarization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-classification">Auto Classification</Label>
              <p className="text-sm text-muted-foreground">Automatically categorize emails using AI</p>
            </div>
            <Switch id="ai-classification" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-summary">AI Summaries</Label>
              <p className="text-sm text-muted-foreground">Generate AI summaries for long emails</p>
            </div>
            <Switch id="ai-summary" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="priority-detection">Priority Detection</Label>
              <p className="text-sm text-muted-foreground">Automatically mark important emails</p>
            </div>
            <Switch id="priority-detection" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Manage your data and security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Data Storage</Label>
              <p className="text-sm text-muted-foreground">Your emails are stored securely</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              Encrypted
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button variant="outline" className="w-full" disabled>
              Export Data
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Clear Cache
            </Button>
            <p className="text-xs text-muted-foreground">
              These features are coming soon.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => toast.info('Settings reset to defaults')}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSaveSettings}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
