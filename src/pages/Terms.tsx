import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <LegalPageLayout 
      title="Terms of Service" 
      description="Read the terms and conditions for using Tagmentia's services."
    >
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "#545DEA" }}>Terms of Service</h1>
          <p className="text-muted-foreground">
            Please read these terms carefully before using Tagmentia.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              By accessing or using Tagmentia, you agree to be bound by these Terms of Service and our 
              Privacy Policy. If you do not agree to these terms, please do not use our service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Tagmentia is a digital organization platform that enables users to:</p>
            <ul>
              <li>Save and categorize web links and video content</li>
              <li>Create and manage notes with rich text formatting</li>
              <li>Capture and organize screenshots</li>
              <li>Share content with other users</li>
              <li>Access AI-powered summaries (on premium plans)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Tagmentia is available for users of all ages. For users under 13 years old, we strongly 
              recommend parental guidance and supervision. Users under 18 should have parental or 
              guardian consent to use the service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>User Accounts & Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>When creating an account, you agree to:</p>
            <ul>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Subscriptions & Billing</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p><strong>Plan Tiers:</strong></p>
            <ul>
              <li><strong>Free Plan:</strong> Basic features with usage limits</li>
              <li><strong>Premium Plan:</strong> Enhanced features and increased limits</li>
              {/* <li><strong>Gold Plan:</strong> Unlimited usage and AI features</li> */}
            </ul>
            <p className="mt-4"><strong>Billing:</strong></p>
            <ul>
              <li>Subscriptions are billed through Stripe or in-app purchases (iOS/Android)</li>
              <li>Subscriptions automatically renew unless canceled</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>Refunds are handled according to our refund policy or store policies</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              The Tagmentia name, logo, design, and all related intellectual property are owned by 
              <strong> Disinnova Ltd</strong>. You retain ownership of content you create and upload, 
              but grant us a license to store, display, and process it to provide our services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Prohibited Use</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>You agree NOT to use Tagmentia to:</p>
            <ul>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload illegal, infringing, or inappropriate content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use automated scraping or data collection tools</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Impersonate others or misrepresent your identity</li>
              <li>Distribute malware, viruses, or harmful code</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Limitation of Liability & Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Tagmentia is provided "as is" without warranties of any kind. We do not guarantee 
              uninterrupted or error-free service. To the maximum extent permitted by law, Disinnova Ltd 
              shall not be liable for any indirect, incidental, or consequential damages arising from 
              your use of the service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Termination of Account</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We reserve the right to:</p>
            <ul>
              <li>Suspend or terminate accounts that violate these terms</li>
              <li>Remove content that violates our policies</li>
              <li>Refuse service to anyone for any reason</li>
            </ul>
            <p className="mt-4">
              You may terminate your account at any time by visiting the{" "}
              <a href="/account-deletion" className="font-medium" style={{ color: "#545DEA" }}>Account Deletion page</a>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              These Terms of Service are governed by the laws of the <strong>United Kingdom</strong>. 
              Any disputes shall be resolved in UK courts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>For questions about these Terms of Service, contact us:</p>
            <ul>
              <li>Email: <a href="mailto:support@tagmentia.com" style={{ color: "#545DEA" }}>support@tagmentia.com</a></li>
              <li>Support Page: <a href="/support" style={{ color: "#545DEA" }}>Contact Support</a></li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground mt-8 pb-8">
          <p>Last updated: {lastUpdated}</p>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default Terms;
