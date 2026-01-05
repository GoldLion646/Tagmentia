import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PrivacyPolicy = () => {
  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <LegalPageLayout 
      title="Privacy Policy" 
      description="Learn how Tagmentia collects, uses, and protects your personal information."
    >
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "#545DEA" }}>Privacy Policy</h1>
          <p className="text-muted-foreground">
            This Privacy Policy describes how Tagmentia collects, uses, and protects your information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We collect various types of information to provide and improve our service:</p>
            <ul>
              <li><strong>Account Data:</strong> Email address, name, and authentication credentials</li>
              <li><strong>Usage Data:</strong> Links saved, categories created, notes, and screenshots</li>
              <li><strong>Device Information:</strong> Browser type, device type, IP address, and operating system</li>
              <li><strong>Analytics Data:</strong> App usage patterns, feature interactions, and performance metrics</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>How We Use Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Your information is used for the following purposes:</p>
            <ul>
              <li><strong>Authentication:</strong> To verify your identity and provide secure access</li>
              <li><strong>Personalization:</strong> To customize your experience and save your preferences</li>
              <li><strong>Support:</strong> To respond to your inquiries and provide customer assistance</li>
              <li><strong>Service Improvement:</strong> To analyze usage patterns and enhance features</li>
              <li><strong>Marketing:</strong> Only with your explicit consent, to send promotional communications</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Sharing of Information</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We share information only in limited circumstances:</p>
            <ul>
              <li><strong>Payment Processors:</strong> Stripe for subscription billing</li>
              <li><strong>Analytics Providers:</strong> Aggregate usage data for service improvement</li>
              <li><strong>Storage Providers:</strong> Secure cloud storage for your saved content</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="mt-4"><strong>We do not sell your personal data to third parties.</strong></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Data Retention & Deletion</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We retain your data as follows:</p>
            <ul>
              <li><strong>Active Accounts:</strong> Data is stored while your account is active</li>
              <li><strong>Deleted Accounts:</strong> Data is permanently removed within 30 days of deletion</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
            </ul>
            <p className="mt-4">
              You have the right to request deletion of your account at any time. Visit our{" "}
              <a href="/account-deletion" className="font-medium" style={{ color: "#545DEA" }}>Account Deletion page</a>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Security Measures</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We implement industry-standard security measures:</p>
            <ul>
              <li>Encrypted connections (HTTPS/SSL) for all data transmission</li>
              <li>Secure authentication and password hashing</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Restricted access to personal data on a need-to-know basis</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>User Rights & Choices</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>You have the following rights regarding your data:</p>
            <ul>
              <li><strong>Access:</strong> View your personal information in your account settings</li>
              <li><strong>Edit:</strong> Update your profile and preferences at any time</li>
              <li><strong>Delete:</strong> Request complete account deletion</li>
              <li><strong>Export:</strong> Request a copy of your data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Tagmentia can be used by individuals of all ages. For users under 13 years of age, we 
              recommend parental guidance and supervision. Parents or guardians should review this 
              Privacy Policy and help younger users understand how their information is collected and used.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ color: "#545DEA" }}>Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
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

export default PrivacyPolicy;
