import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HelpFeedbackRequest {
  type: 'support' | 'feedback' | 'complaint';
  message: string;
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, message, userEmail, userName }: HelpFeedbackRequest = await req.json();

    // Validate required fields
    if (!type || !message || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Determine subject and email content based on type
    const getSubjectAndContent = (type: string) => {
      switch (type) {
        case 'support':
          return {
            subject: `Support Request from ${userName}`,
            category: 'Support Request'
          };
        case 'feedback':
          return {
            subject: `Feedback from ${userName}`,
            category: 'User Feedback'
          };
        case 'complaint':
          return {
            subject: `Complaint from ${userName}`,
            category: 'User Complaint'
          };
        default:
          return {
            subject: `Message from ${userName}`,
            category: 'General Message'
          };
      }
    };

    const { subject, category } = getSubjectAndContent(type);

    // Send email to Tagmentia team
    const teamEmailResponse = await resend.emails.send({
      from: "Tagmentia <noreply@tagmentia.com>",
      to: ["support@tagmentia.com"], // Replace with actual support email
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #e1e5e9; padding-bottom: 10px;">
            New ${category}
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>From:</strong> ${userName} (${userEmail})</p>
            <p><strong>Type:</strong> ${category}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Message:</h3>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; border-radius: 0 5px 5px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
          
          <p style="color: #666; font-size: 12px;">
            This message was sent through the Tagmentia Help & Feedback system.
            Please respond to the user directly at ${userEmail}.
          </p>
        </div>
      `,
    });

    // Send confirmation email to user
    const userEmailResponse = await resend.emails.send({
      from: "Tagmentia Support <noreply@tagmentia.com>",
      to: [userEmail],
      subject: `We received your ${type === 'support' ? 'support request' : type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e1e5e9;">
            <h1 style="color: #333; margin: 0;">Tagmentia</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Thank you for contacting us, ${userName}!</h2>
            
            <p style="color: #555; line-height: 1.6;">
              We have received your ${category.toLowerCase()} and will get back to you as soon as possible. 
              Our support team typically responds within 24-48 hours during business days.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Your message:</h3>
              <p style="color: #666; margin-bottom: 0;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
            </div>
            
            <p style="color: #555; line-height: 1.6;">
              If you have any urgent issues, please don't hesitate to contact us directly at 
              <a href="mailto:support@tagmentia.com" style="color: #007bff;">support@tagmentia.com</a>.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9;">
              <p style="color: #333; margin-bottom: 10px;"><strong>Best regards,</strong></p>
              <p style="color: #666; margin: 0;">The Tagmentia Support Team</p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e1e5e9;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Team email sent:", teamEmailResponse);
    console.log("User confirmation email sent:", userEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Your message has been sent successfully!" 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-help-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send message" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);