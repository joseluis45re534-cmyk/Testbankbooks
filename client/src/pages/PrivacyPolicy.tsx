import { useQuery } from "@tanstack/react-query";
import { Shield, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import type { CartItem } from "@shared/schema";

export default function PrivacyPolicy() {
  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Privacy Policy"
        description="Learn how NursTestBank collects, uses, and protects your personal data. GDPR-compliant privacy practices for your peace of mind."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-privacy-title">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Introduction</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  NursTestBank ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and purchase our digital products, including nursing test banks and study guides.
                </p>
                <p>
                  By accessing or using our services, you agree to this Privacy Policy. If you do not agree with the terms of this policy, please do not access the site.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Personal Data</h3>
                  <p>We may collect personally identifiable information that you voluntarily provide when making a purchase or contacting us, including:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Billing address</li>
                    <li>Payment information (processed securely through third-party payment processors)</li>
                    <li>Phone number (if provided)</li>
                    <li>IP address</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Automatically Collected Data</h3>
                  <p>When you visit our website, we automatically collect certain information, including:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Browser type and version</li>
                    <li>Operating system</li>
                    <li>Referring website</li>
                    <li>Pages visited and time spent on pages</li>
                    <li>Device identifiers</li>
                    <li>Click patterns and browsing behavior</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Cookies and Tracking Technologies</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>We use cookies and similar tracking technologies to enhance your browsing experience. These include:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Essential Cookies:</strong> Required for the website to function properly, including session management and shopping cart functionality.</li>
                  <li><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how visitors interact with our website by collecting and reporting information anonymously (e.g., Google Analytics).</li>
                  <li><strong className="text-foreground">Marketing Cookies:</strong> Used to deliver relevant advertisements and track ad campaign performance.</li>
                  <li><strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences for a better user experience.</li>
                </ul>
                <p>You can control cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Process and fulfill your digital product orders</li>
                  <li>Send purchase confirmations and download links</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Improve our website, products, and services</li>
                  <li>Personalize your shopping experience</li>
                  <li>Send promotional emails and newsletters (with your consent)</li>
                  <li>Detect and prevent fraud or unauthorized access</li>
                  <li>Comply with legal obligations</li>
                  <li>Analyze website usage and trends</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Third-Party Sharing</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>We do not sell your personal information. We may share your data with trusted third parties only in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Payment Processors:</strong> To securely process your transactions (e.g., Stripe, PayPal).</li>
                  <li><strong className="text-foreground">Email Service Providers:</strong> To send order confirmations, download links, and marketing communications.</li>
                  <li><strong className="text-foreground">Analytics Providers:</strong> To help us understand and improve website performance (e.g., Google Analytics).</li>
                  <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
                  <li><strong className="text-foreground">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets.</li>
                </ul>
                <p>All third-party service providers are contractually obligated to protect your data and use it only for the purposes we specify.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>We retain your personal data only for as long as necessary to fulfill the purposes outlined in this policy:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Transaction Records:</strong> Retained for 7 years for tax and legal compliance.</li>
                  <li><strong className="text-foreground">Account Information:</strong> Retained while your account is active and for 30 days after deletion request.</li>
                  <li><strong className="text-foreground">Download Records:</strong> Retained for 1 year after purchase.</li>
                  <li><strong className="text-foreground">Marketing Preferences:</strong> Retained until you unsubscribe or request removal.</li>
                  <li><strong className="text-foreground">Support Communications:</strong> Retained for 2 years for quality assurance.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Your Rights (GDPR & CCPA)</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>Depending on your location, you may have the following rights regarding your personal data:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong className="text-foreground">Right to Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                  <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your personal data ("right to be forgotten").</li>
                  <li><strong className="text-foreground">Right to Data Portability:</strong> Receive your data in a structured, commonly used format.</li>
                  <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request that we limit the processing of your data.</li>
                  <li><strong className="text-foreground">Right to Object:</strong> Object to the processing of your data for marketing purposes.</li>
                  <li><strong className="text-foreground">Right to Withdraw Consent:</strong> Withdraw your consent at any time where processing is based on consent.</li>
                </ul>
                <p>To exercise any of these rights, please contact us at support@nurstestbank.com. We will respond to your request within 30 days.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>SSL/TLS encryption for all data transmissions</li>
                  <li>Secure payment processing through PCI-compliant providers</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Employee training on data protection practices</li>
                </ul>
                <p>While we strive to protect your personal data, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Our services are not intended for individuals under the age of 16. We do not knowingly collect personal data from children under 16. If we become aware that we have collected personal data from a child under 16 without parental consent, we will take steps to delete that information promptly.
                </p>
                <p>
                  If you believe that we have inadvertently collected information from a child under 16, please contact us immediately at support@nurstestbank.com.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. International Data Transfers</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Your information may be transferred to and maintained on servers located outside your state, province, country, or other governmental jurisdiction where data protection laws may differ. If you are located outside the United States and choose to provide information to us, please note that we transfer the data to the United States and process it there.
                </p>
                <p>
                  For transfers from the European Economic Area (EEA) or the United Kingdom, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically to stay informed about how we protect your information.
                </p>
                <p>
                  Material changes will be communicated via email or a prominent notice on our website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>12. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us:</p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href="mailto:support@nurstestbank.com" className="hover:underline" data-testid="link-privacy-email">support@nurstestbank.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href="tel:+33644657808" className="hover:underline" data-testid="link-privacy-phone">+33 6 44 65 78 08</a>
                  </div>
                </div>
                <p className="mt-4">
                  <strong className="text-foreground">NursTestBank</strong><br />
                  Data Protection Officer<br />
                  7 Rue des Noyers, 69005 Lyon, France<br />
                  Email: support@nurstestbank.com
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
