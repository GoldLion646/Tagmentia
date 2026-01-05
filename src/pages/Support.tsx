import { useState } from "react";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { z } from "zod";

const supportSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  category: z.enum(["Support", "Feedback", "Complaint"]),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

const Support = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "Support" as "Support" | "Feedback" | "Complaint",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = supportSchema.parse(formData);
      setIsSubmitting(true);

      const { error } = await supabase.functions.invoke('send-help-feedback', {
        body: {
          name: validated.name,
          email: validated.email,
          category: validated.category,
          message: validated.message,
        },
      });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: "Thank you! We'll get back to you soon.",
      });

      setFormData({ name: "", email: "", category: "Support", message: "" });
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
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LegalPageLayout 
      title="Contact Support" 
      description="Get help with your Tagmentia account or provide feedback about our service."
    >
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "#545DEA" }}>Contact Support</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Need help with your account or have a question about your plan? Contact us below and we'll 
            get back to you as soon as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: "#545DEA" }} />
                Send Us a Message
              </CardTitle>
              <CardDescription>Fill out the form below to get in touch</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="Feedback">Feedback</SelectItem>
                      <SelectItem value="Complaint">Complaint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please describe your issue or feedback in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.message.length}/2000 characters
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: "#545DEA" }}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Direct Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" style={{ color: "#545DEA" }} />
                  Direct Email
                </CardTitle>
                <CardDescription>Prefer to email us directly?</CardDescription>
              </CardHeader>
              <CardContent>
                <a 
                  href="mailto:support@tagmentia.com" 
                  className="text-lg font-medium hover:underline"
                  style={{ color: "#545DEA" }}
                >
                  support@tagmentia.com
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  We typically respond within 24-48 hours during business days.
                </p>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Quick answers to common questions</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How do I upgrade my plan?</AccordionTrigger>
                    <AccordionContent>
                      You can upgrade your plan from the Settings page in the app. Navigate to 
                      Settings → Subscription → Choose Plan. Premium plan unlocks additional 
                      features and storage.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>How do I delete my account?</AccordionTrigger>
                    <AccordionContent>
                      Visit our <a href="/account-deletion" className="underline" style={{ color: "#545DEA" }}>
                      Account Deletion page</a> for instructions. You can delete your account instantly 
                      from Settings in the app, or request assistance through our support form.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>What are the storage limits?</AccordionTrigger>
                    <AccordionContent>
                      Free Plan: 5 screenshots, 3 categories max, 10 videos per category. Premium Plan: Unlimited snapshots, 
                      unlimited categories, unlimited videos per category, 500 MB storage quota.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>Can I cancel my subscription anytime?</AccordionTrigger>
                    <AccordionContent>
                      Yes! You can cancel your subscription at any time from Settings → Subscription. 
                      Your subscription remains active until the end of your current billing period.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>How do I share content with others?</AccordionTrigger>
                    <AccordionContent>
                      Tagmentia supports sharing links and videos. Simply tap the share icon on any 
                      saved item to generate a shareable link or send directly to other users.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default Support;
