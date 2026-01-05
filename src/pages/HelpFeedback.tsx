import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Headphones, Lightbulb, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type MessageType = 'support' | 'feedback' | 'complaint' | null;

export const HelpFeedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<MessageType>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messageTypes = [
    {
      id: 'support' as const,
      title: 'Support Request',
      icon: Headphones,
      description: 'Get help with technical issues'
    },
    {
      id: 'feedback' as const,
      title: 'Feedback',
      icon: Lightbulb,
      description: 'Share your suggestions and ideas'
    },
    {
      id: 'complaint' as const,
      title: 'Complaint',
      icon: FileText,
      description: 'Report issues or concerns'
    }
  ];

  const handleSendMessage = async () => {
    if (!selectedType) {
      toast({
        title: "Please select a message type",
        description: "Choose whether this is a support request, feedback, or complaint.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Please enter your message",
        description: "Your message cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to send a message.",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to send the message
      const { data, error } = await supabase.functions.invoke('send-help-feedback', {
        body: {
          type: selectedType,
          message: message.trim(),
          userEmail: user.email,
          userName: user.user_metadata?.first_name || user.email
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Message sent successfully!",
        description: "We have received your message and will respond as soon as possible.",
      });

      // Reset form
      setSelectedType(null);
      setMessage("");
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-3"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Help & Feedback</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Message Type Selection */}
        <div className="grid grid-cols-1 gap-4">
          {messageTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                <CardContent className="flex items-center p-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{type.title}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Your Message</h3>
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={1000}
          />
          <div className="text-right text-xs text-muted-foreground">
            {message.length}/1000
          </div>
        </div>

        {/* Send Button */}
        <Button 
          className="w-full py-3 text-base font-medium"
          onClick={handleSendMessage}
          disabled={isLoading || !selectedType || !message.trim()}
        >
          {isLoading ? "Sending..." : "Send Message"}
        </Button>
      </div>

      {/* Footer */}
      <div className="flex justify-center items-center gap-6 p-6 border-t bg-muted/30">
        <Button 
          variant="link" 
          className="text-sm text-muted-foreground p-0 h-auto"
          onClick={() => {
            // Navigate to terms & conditions or open in new tab
            window.open('/terms', '_blank');
          }}
        >
          Terms & Conditions
        </Button>
        <Button 
          variant="link" 
          className="text-sm text-muted-foreground p-0 h-auto"
          onClick={() => {
            // Navigate to privacy policy or open in new tab
            window.open('/privacy', '_blank');
          }}
        >
          Privacy Policy
        </Button>
      </div>
    </div>
  );
};