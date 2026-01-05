import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Copy, 
  Download, 
  RefreshCw, 
  Clock, 
  Tag, 
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoSummary {
  id: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  tldr?: string;
  key_points?: string[];
  timestamps?: Array<{time: string; description: string}>;
  tags?: string[];
  transcript?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface VideoSummarySectionProps {
  videoId: string;
  videoTitle: string;
  canUseAISummary: boolean;
  onUpgradePrompt: () => void;
}

export const VideoSummarySection = ({ 
  videoId, 
  videoTitle, 
  canUseAISummary, 
  onUpgradePrompt 
}: VideoSummarySectionProps) => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(`ai-summaries/${videoId}`);
      
      if (error) {
        if (error.message?.includes('No summary found')) {
          setSummary(null);
          return;
        }
        throw error;
      }

      setSummary(data.summary);
    } catch (err: any) {
      console.error('Failed to fetch summary:', err);
      setError(err.message);
    }
  };

  const handleSummarize = async () => {
    if (!canUseAISummary) {
      onUpgradePrompt();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-summarize', {
        body: { video_id: videoId }
      });

      if (error) {
        if (error.message?.includes('quota exceeded')) {
          toast({
            title: "Daily Limit Reached",
            description: "You've reached your daily summary limit of 20. Try again tomorrow.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Summary Started",
        description: "Your video is being summarized. This may take a few moments.",
      });

      setSummary({
        id: data.summary_id,
        status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Poll for updates
      pollSummaryStatus(data.summary_id);

    } catch (err: any) {
      console.error('Failed to start summarization:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to start summarization",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!summary?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(`ai-regenerate/${summary.id}`, {
        method: 'POST'
      });

      if (error) {
        if (error.message?.includes('quota exceeded')) {
          toast({
            title: "Daily Limit Reached",
            description: "You've reached your daily summary limit. Try again tomorrow.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Regenerating Summary",
        description: "Creating a new summary for this video.",
      });

      setSummary(prev => prev ? { ...prev, status: 'queued' } : null);
      pollSummaryStatus(summary.id);

    } catch (err: any) {
      console.error('Failed to regenerate summary:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to regenerate summary",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const pollSummaryStatus = async (summaryId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError("Summary took too long to generate. Please try again.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(`ai-summaries/${videoId}`);
        
        if (error || !data?.summary) {
          attempts++;
          setTimeout(poll, 2000);
          return;
        }

        const currentSummary = data.summary;
        setSummary(currentSummary);

        if (currentSummary.status === 'ready') {
          toast({
            title: "Summary Complete",
            description: "Your video summary is ready!",
          });
        } else if (currentSummary.status === 'failed') {
          setError(currentSummary.error_message || "Summary generation failed");
        } else if (currentSummary.status === 'processing' || currentSummary.status === 'queued') {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error('Polling error:', err);
        attempts++;
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const handleDownload = () => {
    if (!summary) return;

    const content = [
      `Video Summary: ${videoTitle}`,
      `Generated: ${new Date(summary.created_at).toLocaleDateString()}`,
      '',
      'TL;DR:',
      summary.tldr || 'No summary available',
      '',
      'Key Points:',
      ...(summary.key_points?.map((point, i) => `${i + 1}. ${point}`) || []),
      '',
      'Tags:',
      summary.tags?.join(', ') || 'No tags available',
      '',
      'Timestamps:',
      ...(summary.timestamps?.map(ts => `${ts.time} - ${ts.description}`) || []),
      ...(summary.transcript ? ['', 'Transcript:', summary.transcript] : [])
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Summary downloaded as text file",
    });
  };

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [videoId]);

  const getStatusBadge = () => {
    if (!summary) return null;

    const statusConfig = {
      queued: { variant: "secondary" as const, icon: Clock, text: "Queued" },
      processing: { variant: "secondary" as const, icon: Loader2, text: "Processing" },
      ready: { variant: "default" as const, icon: CheckCircle, text: "Ready" },
      failed: { variant: "destructive" as const, icon: AlertCircle, text: "Failed" }
    };

    const config = statusConfig[summary.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${summary.status === 'processing' ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Summary
        </CardTitle>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {summary?.status === 'ready' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!summary ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No AI summary available for this video yet.
            </p>
            <Button 
              onClick={handleSummarize} 
              disabled={loading || !canUseAISummary}
              className="flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Brain className="h-4 w-4" />
              Summarize Video (AI)
            </Button>
            {!canUseAISummary && (
              <p className="text-sm text-muted-foreground mt-2">
                AI summaries are available for Gold users only
              </p>
            )}
          </div>
        ) : summary.status === 'failed' ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">
              {error || summary.error_message || "Summary generation failed"}
            </p>
            <Button onClick={handleRegenerate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Try Again
            </Button>
          </div>
        ) : summary.status === 'queued' || summary.status === 'processing' ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">
              {summary.status === 'queued' ? 'Summary queued for processing...' : 'Processing your summary...'}
            </p>
          </div>
        ) : (
          <>
            {/* TL;DR Section */}
            {summary.tldr && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    TL;DR
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(summary.tldr!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {summary.tldr}
                </p>
              </div>
            )}

            {/* Key Points */}
            {summary.key_points && summary.key_points.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Key Points</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(summary.key_points!.join('\n'))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="font-medium text-primary mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Timestamps */}
            {summary.timestamps && summary.timestamps.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timestamps
                  </h4>
                  <div className="space-y-2">
                    {summary.timestamps.map((timestamp, index) => (
                      <div key={index} className="text-sm flex items-start gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {timestamp.time}
                        </Badge>
                        <span>{timestamp.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Tags */}
            {summary.tags && summary.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Transcript - Only for Gold users with transcript data */}
            {summary.transcript && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Video Transcript
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                      Gold Feature
                    </Badge>
                  </h4>
                  <div className="max-h-64 overflow-y-auto bg-gradient-to-br from-amber-50/30 to-amber-100/20 p-4 rounded-lg border border-amber-200/30">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {summary.transcript}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download as .txt
              </Button>
              {summary.tldr && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(summary.tldr!)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy TL;DR
                </Button>
              )}
              {summary.transcript && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(summary.transcript!)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Transcript
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};