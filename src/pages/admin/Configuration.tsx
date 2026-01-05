import { Key } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { LogoConfigurationSection } from "@/components/admin/LogoConfigurationSection"
import { GoogleOAuthConfigurationSection } from "@/components/admin/GoogleOAuthConfigurationSection"
import { OpenAIConfigurationSection } from "@/components/admin/OpenAIConfigurationSection"
import { SupabaseConfigurationSection } from "@/components/admin/SupabaseConfigurationSection"
import { StripeConfigurationSection } from "@/components/admin/StripeConfigurationSection"
import { PushNotificationConfigurationSection } from "@/components/admin/PushNotificationConfigurationSection"
import { TwilioConfigurationSection } from "@/components/admin/TwilioConfigurationSection"
import { ResendConfigurationSection } from "@/components/admin/ResendConfigurationSection"
import { StorageConfigurationSection } from "@/components/admin/StorageConfigurationSection"

export function Configuration() {

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Key className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
          <p className="text-muted-foreground">
            Manage and view your application configuration keys and settings
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Logo Configuration Section */}
        <LogoConfigurationSection />
        <Separator className="my-6" />

        {/* Storage Configuration Section */}
        <StorageConfigurationSection />
        <Separator className="my-6" />

        {/* Supabase Configuration Section */}
        <SupabaseConfigurationSection />
        <Separator className="my-6" />

        {/* Google OAuth Configuration Section */}
        <GoogleOAuthConfigurationSection />
        <Separator className="my-6" />

        {/* OpenAI Configuration Section */}
        <OpenAIConfigurationSection />
        <Separator className="my-6" />

        {/* Stripe Configuration Section */}
        <StripeConfigurationSection />
        <Separator className="my-6" />

        {/* Push Notification Configuration Section */}
        <PushNotificationConfigurationSection />
        <Separator className="my-6" />

        {/* Twilio Configuration Section */}
        <TwilioConfigurationSection />
        <Separator className="my-6" />

        {/* Resend Configuration Section */}
        <ResendConfigurationSection />
      </div>
    </div>
  )
}