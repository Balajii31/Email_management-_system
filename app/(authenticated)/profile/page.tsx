'use client';

import { useAuth } from '@/components/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Calendar, Shield, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal details and account status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || 'User'} />
              <AvatarFallback className="text-2xl">
                {getInitials(user.user_metadata?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{user.user_metadata?.full_name || 'User'}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {user.user_metadata?.provider || 'Email'}
                </Badge>
                {user.email_confirmed_at && (
                  <Badge variant="outline" className="gap-1 text-green-600">
                    <Mail className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </Label>
              <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Sign In
              </Label>
              <p className="text-sm font-medium">{formatDate(user.last_sign_in_at)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Account ID
              </Label>
              <p className="text-sm font-medium font-mono text-xs">{user.id.slice(0, 20)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Services */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>Manage your connected email accounts and integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Gmail</p>
                <p className="text-sm text-muted-foreground">Sync emails from your Gmail account</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/api/auth/gmail-connect'}
            >
              {user.user_metadata?.gmail_connected ? 'Reconnect' : 'Connect'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Manage your account security and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            Update Email Preferences
          </Button>
          <Button variant="destructive" className="w-full justify-start" disabled>
            Delete Account
          </Button>
          <p className="text-xs text-muted-foreground">
            These features are coming soon. Contact support for account changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
