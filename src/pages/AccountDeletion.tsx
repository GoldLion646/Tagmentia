import { useState } from "react";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, AlertTriangle, Settings } from "lucide-react";
import { z } from "zod";

const deletionRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm that you understand your data will be deleted",
  }),
});

const AccountDeletion = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = deletionRequestSchema.parse({ email, confirmed });
      setIsSubmitting(true);

      const { error } = await supabase.functions.invoke('send-help-feedback', {
        body: {
          name: "Account Deletion Request",
          email: validated.email,
          category: "Support",
          message: `User has requested account deletion for email: ${validated.email}. User confirmed understanding of permanent data deletion.`,
        },
      });

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "We've received your account deletion request. Our team will process it and contact you at the provided email.",
      });

      setEmail("");
      setConfirmed(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LegalPageLayout 
      title="Account Deletion" 
      description="Learn how to permanently delete your Tagmentia account and all associated data."
    >
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "#545DEA" }}>Account Deletion</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            You can delete your Tagmentia account at any time. Deletion permanently removes your 
            profile, saved links, snapshots, and notes.
          </p>
        </div>

        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <strong>Warning:</strong> Account deletion is permanent and cannot be undone. All your data 
            including saved links, categories, notes, screenshots, and preferences will be permanently deleted.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          {/* In-App Deletion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" style={{ color: "#545DEA" }} />
                In-App Deletion (Instant)
              </CardTitle>
              <CardDescription>Delete your account directly from the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm dark:prose-invert">
                <p>To delete your account instantly:</p>
                <ol>
                  <li>Open the Tagmentia app</li>
                  <li>Navigate to <strong>Settings</strong></li>
                  <li>Scroll to <strong>Account</strong> section</li>
                  <li>Tap <strong>Delete Account</strong></li>
                  <li>Confirm the deletion</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-4">
                  Your account and all associated data will be permanently removed within minutes.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/profile'}
              >
                Go to Account Settings
              </Button>
            </CardContent>
          </Card>

          {/* Request Assistance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" style={{ color: "#545DEA" }} />
                Request Assistance
              </CardTitle>
              <CardDescription>
                Need help deleting your account? Submit a request below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email associated with your Tagmentia account
                  </p>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirm"
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                    required
                  />
                  <Label
                    htmlFor="confirm"
                    className="text-sm font-normal leading-tight cursor-pointer"
                  >
                    I understand my data will be permanently deleted and this action cannot be undone.
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="destructive"
                  disabled={isSubmitting || !confirmed}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Deletion Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* What Gets Deleted */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>What Gets Deleted?</CardTitle>
            <CardDescription>
              When you delete your account, the following data is permanently removed:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  Profile information (name, email, avatar)
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  All saved links and videos
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  Categories and organization
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  Notes and annotations
                </li>
              </ul>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  Screenshots and uploaded files
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  Subscription information
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  App preferences and settings
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#545DEA" }} />
                  Usage history and analytics
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              <strong>Processing Time:</strong> In-app deletion is instant. Deletion requests 
              submitted through this form are typically processed within 2-3 business days.
            </p>
            <p>
              <strong>Active Subscriptions:</strong> If you have an active paid subscription, 
              please cancel it before deleting your account to avoid future charges. Visit your 
              subscription settings or contact your app store.
            </p>
            <p>
              <strong>Data Retention:</strong> Some anonymized usage data may be retained for 
              up to 30 days for legal and security purposes, as outlined in our{" "}
              <a href="/privacy-policy" className="font-medium" style={{ color: "#545DEA" }}>Privacy Policy</a>.
            </p>
            <p>
              <strong>Questions?</strong> If you have questions about account deletion or data privacy, 
              visit our <a href="/support" className="font-medium" style={{ color: "#545DEA" }}>Support page</a> or 
              email <a href="mailto:support@tagmentia.com" style={{ color: "#545DEA" }}>support@tagmentia.com</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </LegalPageLayout>
  );
};

export default AccountDeletion;
