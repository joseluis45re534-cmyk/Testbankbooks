import { useQuery } from "@tanstack/react-query";
import { Shield, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import type { CartItem } from "@shared/schema";

export default function TermsConditions() {
  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Terms & Conditions"
        description="Read the Terms and Conditions for using NursTestBank. Understand your rights and obligations when purchasing digital test banks and study guides."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-terms-title">Terms & Conditions</h1>
              <p className="text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  By accessing and using the NursTestBank website and purchasing our products, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not use our website or services.
                </p>
                <p>
                  These terms constitute a legally binding agreement between you ("User," "you," or "your") and NursTestBank ("we," "our," or "us"). We reserve the right to modify these terms at any time, and your continued use of the website constitutes acceptance of any changes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Nature of Our Products</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  NursTestBank sells professionally printed study books that are shipped to the customer. Our products include, but are not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Printed study books containing practice questions and answer rationales</li>
                  <li>Printed study guides and supplementary learning materials</li>
                  <li>Reference books for nursing and healthcare education</li>
                </ul>
                <p>
                  Each printed book ships with free standard shipping and includes a complimentary digital copy emailed to the customer after purchase. Delivery timelines and shipping details are described in our Shipping Policy, and returns are governed by our Refund Policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Intellectual Property Rights</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  All content on this website, including but not limited to text, graphics, logos, images, digital downloads, and software, is the property of NursTestBank or its content suppliers and is protected by United States and international copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  The compilation of all content on this site is the exclusive property of NursTestBank. Unauthorized use, reproduction, modification, distribution, or storage of any content for any purpose other than personal, non-commercial use is strictly prohibited without prior written permission.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. License to Use Purchased Materials</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Upon purchasing a product from NursTestBank, you are granted a limited, non-exclusive, non-transferable, revocable license to use the purchased materials for personal, educational purposes only. This license permits you to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Download the purchased materials to your personal devices</li>
                  <li>Use the materials for personal study and exam preparation</li>
                  <li>Print portions for personal, non-commercial use</li>
                </ul>
                <p>This license does not grant you ownership of the content. All intellectual property rights remain with NursTestBank and/or the original content creators.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Prohibited Uses</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Redistribute, resell, share, or make available any purchased materials to third parties</li>
                  <li>Upload purchased materials to any file-sharing platform, website, or public repository</li>
                  <li>Use purchased materials for any commercial purpose without written authorization</li>
                  <li>Remove or alter any copyright notices, watermarks, or proprietary designations</li>
                  <li>Attempt to reverse engineer, decompile, or extract source content from our materials</li>
                  <li>Use any automated system or bot to access or scrape our website</li>
                  <li>Create derivative works based on our materials for distribution</li>
                  <li>Use the materials to engage in academic dishonesty or violate any educational institution's honor code</li>
                  <li>Impersonate another person or entity while using our services</li>
                </ul>
                <p>Violation of these terms may result in immediate termination of your license and legal action.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  When you make a purchase or create an account on our website, you are responsible for maintaining the confidentiality of your account credentials. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access or security breach</li>
                </ul>
                <p>
                  We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Payment Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  All prices are listed in United States Dollars (USD) unless otherwise noted. By placing an order, you agree to pay the full price displayed at the time of purchase. Payment terms include:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Payment is required in full at the time of purchase before download access is granted</li>
                  <li>We accept major credit cards, debit cards, and PayPal</li>
                  <li>All transactions are processed through secure, PCI-compliant payment processors</li>
                  <li>Prices are subject to change without prior notice, but changes will not affect existing orders</li>
                  <li>Sales tax may apply depending on your jurisdiction</li>
                </ul>
                <p>
                  We reserve the right to refuse or cancel orders at our discretion, including in cases of suspected fraud or pricing errors.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  To the fullest extent permitted by applicable law, NursTestBank shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Personal injury or property damage</li>
                  <li>Unauthorized access to or alteration of your data</li>
                  <li>Any errors or omissions in content or materials</li>
                  <li>Service interruptions or technical failures</li>
                </ul>
                <p>
                  Our total liability for any claim arising from or related to these terms or your use of the website shall not exceed the amount you paid for the specific product giving rise to the claim.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Disclaimer of Warranties</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Our products are provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not guarantee that:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The materials will meet your specific requirements or expectations</li>
                  <li>Use of our materials will result in specific academic outcomes</li>
                  <li>The website will be uninterrupted, secure, or error-free</li>
                  <li>Any errors or defects in the materials will be corrected</li>
                </ul>
                <p>
                  Our study materials are intended as supplementary educational resources and should not be used as the sole basis for exam preparation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Indemnification</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  You agree to indemnify, defend, and hold harmless NursTestBank, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney fees) arising out of or in any way connected with your use of our website, violation of these terms, or infringement of any intellectual property or other rights of any person or entity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Governing Law</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  These Terms and Conditions shall be governed by and construed in accordance with the laws of the United States and the State of New York, without regard to its conflict of law provisions. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts located in New York, New York.
                </p>
                <p>
                  If any provision of these terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>12. Modifications to Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  We reserve the right to update or modify these Terms and Conditions at any time without prior notice. Changes will become effective immediately upon posting to the website. It is your responsibility to review these terms periodically.
                </p>
                <p>
                  Your continued use of the website after any modifications to these terms constitutes your acceptance of the revised terms. If you do not agree with any changes, you must discontinue use of the website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>13. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>For questions or concerns about these Terms and Conditions, please contact us:</p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href="mailto:support@nurstestbank.com" className="hover:underline" data-testid="link-terms-email">support@nurstestbank.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href="tel:+13303908394" className="hover:underline" data-testid="link-terms-phone">+1 (330) 390-8394</a>
                  </div>
                </div>
                <p className="mt-4 text-muted-foreground">
                  <strong className="text-foreground">NursTestBank</strong><br />
                  7 Rue des Noyers, 69005 Lyon, France
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
