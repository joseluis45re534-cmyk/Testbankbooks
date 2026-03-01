import { useQuery } from "@tanstack/react-query";
import { Download, Mail, Phone, Clock, Shield, Zap, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import type { CartItem } from "@shared/schema";

export default function ShippingPolicy() {
  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Shipping & Delivery Policy"
        description="Learn about Testbankbooks' digital delivery process. Instant download access, email delivery, and troubleshooting for your test bank purchases."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Download className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-shipping-title">Shipping & Delivery Policy</h1>
              <p className="text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">100% Digital Delivery - Instant Access</h2>
              </div>
              <p className="text-muted-foreground">
                All Testbankbooks products are digital goods delivered electronically. There is no physical shipping involved. You will receive instant access to your purchased materials immediately after successful payment.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Digital Delivery Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Testbankbooks exclusively sells digital products, including nursing test banks, study guides, and supplementary educational materials. All products are delivered electronically, ensuring instant access with no waiting time.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                    <Zap className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground">Instant Download</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                    <Mail className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground">Email Delivery</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                    <Shield className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground">Secure Access</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How Downloads Work</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>After completing your purchase, you will receive your digital products through two methods:</p>
                <ol className="list-decimal pl-6 space-y-3">
                  <li>
                    <strong className="text-foreground">Instant Download Link:</strong> Immediately after your payment is confirmed, you will be redirected to a download page where you can access and download your purchased materials.
                  </li>
                  <li>
                    <strong className="text-foreground">Email Confirmation:</strong> A confirmation email will be sent to the email address you provided during checkout. This email contains a secure download link for your purchased products.
                  </li>
                </ol>
                <p>
                  Files are typically provided in PDF format and are compatible with all major devices, including computers, tablets, and smartphones.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Email Delivery</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  In addition to the instant download available on the confirmation page, a download link is sent to your email for convenience. Please note:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Confirmation emails are typically delivered within 1-5 minutes of purchase</li>
                  <li>If you do not receive the email, check your spam or junk folder</li>
                  <li>Ensure the email address provided during checkout is correct</li>
                  <li>Add support@testbankbooks.com to your contacts to prevent future emails from being filtered</li>
                </ul>
                <p>
                  If you have not received your confirmation email within 15 minutes, please contact our support team.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Download Limits</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground mb-2">Important Download Restrictions</p>
                    <p>To protect against unauthorized distribution and ensure security, the following limits apply to each purchase:</p>
                  </div>
                </div>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Maximum Downloads:</strong> Each purchase allows up to 5 downloads per product</li>
                  <li><strong className="text-foreground">Link Expiration:</strong> Download links expire 24 hours after the time of purchase</li>
                  <li><strong className="text-foreground">Device Limit:</strong> There is no device limit; you can download on any device within the allowed download count</li>
                </ul>
                <p>
                  We recommend downloading your files promptly after purchase and saving them to a secure location on your device or cloud storage for future access.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Download Link Expiration</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p>
                      All download links are time-sensitive and expire <strong className="text-foreground">24 hours</strong> after the original purchase. After expiration:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>The download link will no longer be accessible</li>
                      <li>You will need to contact our support team for a new download link</li>
                      <li>A new link will be provided after verification of your purchase</li>
                    </ul>
                    <p className="mt-2">
                      We strongly encourage downloading your materials as soon as possible after purchase to avoid any inconvenience.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Troubleshooting Download Issues</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>If you experience any issues downloading your purchased materials, try the following steps:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>
                    <strong className="text-foreground">Check your internet connection:</strong> Ensure you have a stable internet connection before attempting the download.
                  </li>
                  <li>
                    <strong className="text-foreground">Try a different browser:</strong> Some browsers may block downloads. Try using Chrome, Firefox, Safari, or Edge.
                  </li>
                  <li>
                    <strong className="text-foreground">Disable pop-up blockers:</strong> Download links may be blocked by pop-up blockers. Temporarily disable them and try again.
                  </li>
                  <li>
                    <strong className="text-foreground">Clear browser cache:</strong> Clearing your cache and cookies can resolve loading issues.
                  </li>
                  <li>
                    <strong className="text-foreground">Check available storage:</strong> Ensure your device has sufficient storage space for the download.
                  </li>
                  <li>
                    <strong className="text-foreground">Check spam/junk folder:</strong> If you are waiting for the email download link, check your spam or junk folder.
                  </li>
                </ol>
                <p>If none of the above steps resolve your issue, please contact our support team for immediate assistance.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. No Physical Shipping</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Testbankbooks is a 100% digital store. We do not offer physical products, and no items are shipped via postal services or courier. Key points to understand:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>No physical items will be mailed to your address</li>
                  <li>No shipping charges will be applied to your order</li>
                  <li>Your billing address is used for payment verification purposes only</li>
                  <li>There are no shipping delays as all products are available for immediate download</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>If you need assistance with downloading your products or have any delivery-related questions, please contact us:</p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href="mailto:support@testbankbooks.com" className="hover:underline" data-testid="link-shipping-email">support@testbankbooks.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href="tel:+13392284593" className="hover:underline" data-testid="link-shipping-phone">+1 (339) 228-4593</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Business Hours: Monday - Friday, 9:00 AM - 6:00 PM EST</span>
                  </div>
                </div>
                <p className="mt-4">Our support team typically responds within 24 hours during business days.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
