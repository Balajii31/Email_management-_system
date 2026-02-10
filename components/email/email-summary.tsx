'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Languages, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface EmailSummaryProps {
  emailId: string;
  initialSummary?: string;
  onTranslated?: (translation: string) => void;
}

export function EmailSummary({ emailId, initialSummary, onTranslated }: EmailSummaryProps) {
  const [summary, setSummary] = useState<string | undefined>(initialSummary);
  const [translation, setTranslation] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post<any>(`/api/ai/summarize/${emailId}`);
      setSummary(res.data);
      toast.success('Summary generated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      // Assuming we translate the summary if it exists
      const res = await apiClient.post<any>(`/api/ai/translate/${emailId}`, {
        targetLanguage: 'ta'
      });
      setTranslation(res.data);
      if (onTranslated) onTranslated(res.data);
      toast.success('Translated to Tamil');
    } catch (error: any) {
      toast.error(error.message || 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  if (!summary && !loading) {
    return (
      <Button onClick={handleSummarize} variant="outline" size="sm" className="gap-2">
        <Sparkles className="h-4 w-4" />
        Summarize with AI
      </Button>
    );
  }

  return (
    <Card className="bg-muted/50 border-none shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating summary...
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed">{summary}</p>
            {!translation && !translating && (
              <Button onClick={handleTranslate} variant="ghost" size="sm" className="h-8 gap-2 text-xs">
                <Languages className="h-3.5 w-3.5" />
                Translate to Tamil
              </Button>
            )}
            {translating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Translating...
              </div>
            )}
            {translation && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold mb-1 text-primary">Tamil Translation:</p>
                <p className="text-sm leading-relaxed font-tamil">{translation}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
