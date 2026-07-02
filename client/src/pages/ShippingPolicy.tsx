import { useQuery } from "@tanstack/react-query";
import { Download, Mail, Phone, Clock, AlertCircle } from "lucide-react";
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
        title="Delivery Policy"
        description="How NursTestBank delivers your digital study books and test banks — instant download details and instructions."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Download className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-shipping-title">Delivery Policy</h1>
              <p className="text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Download className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">Instant Digital Delivery</h2>
              </div>
              <p className="text-muted-foreground">
                Every NursTestBank order is a digital product delivered instantly. No physical items will be shipped to your address. A download link for your digital copy is provided immediately after purchase and emailed to you for safekeeping.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Delivery Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  NursTestBank sells digital study materials — nursing test prep books, study guides, and supplementary educational files in PDF or other digital formats. Because these are digital goods, there are no shipping fees and no wait times for delivery.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How to Access Your Purchase</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>Here's what to expect after you place an order:</p>
                <ol className="list-decimal pl-6 space-y-3">
                  <li>
                    <strong className="text-foreground">Instant Access:</strong> Upon successful payment, you will be redirected to an order confirmation page containing direct download links to your purchased files.
                  </li>
                  <li>
                    <strong className="text-foreground">Email Delivery:</strong> A confirmation email containing your receipt and download links is automatically sent to the email address provided at checkout.
                  </li>
                  <li>
                    <strong className="text-foreground">Start Studying:</strong> You can download the files to your computer, tablet, or smartphone and begin studying immediately.
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Your Digital Copy Email</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <ul className="list-disc pl-6 space-y-1">
                  <li>Confirmation emails are typically delivered within 1-5 minutes of purchase.</li>
                  <li>If you do not receive the email, check your spam or junk folder.</li>
                  <li>Ensure the email address provided during checkout is correct.</li>
                  <li>Add support@nurstestbank.com to your contacts to prevent future emails from being filtered.</li>
                </ul>
                <p>
                  If you have not received your confirmation email within 15 minutes, please contact our support team.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Download Limits & Expiration</CardTitle>
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
                  <li><strong className="text-foreground">Maximum Downloads:</strong> Each purchase allows up to 5 downloads per product.</li>
                  <li><strong className="text-foreground">Link Expiration:</strong> Download links expire 24 hours after the time of purchase.</li>
                  <li><strong className="text-foreground">Device Limit:</strong> There is no device limit; you can download on any device within the allowed download count.</li>
                </ul>
                <p>
                  We recommend downloading your files promptly after purchase and saving them to a secure location on your device or cloud storage for future access.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Troubleshooting Download Issues</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>If you experience any issues downloading your purchased materials, try the following steps:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li><strong className="text-foreground">Check your internet connection:</strong> Ensure you have a stable internet connection.</li>
                  <li><strong className="text-foreground">Try a different browser:</strong> Some browsers may block downloads. Try using Chrome, Firefox, Safari, or Edge.</li>
                  <li><strong className="text-foreground">Disable pop-up blockers:</strong> Download links may be blocked by pop-up blockers.</li>
                  <li><strong className="text-foreground">Clear browser cache:</strong> Clearing your cache and cookies can resolve loading issues.</li>
                  <li><strong className="text-foreground">Check available storage:</strong> Ensure your device has sufficient storage space.</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>If you need assistance with downloading your products, please contact us:</p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href="mailto:support@nurstestbank.com" className="hover:underline" data-testid="link-shipping-email">support@nurstestbank.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href="tel:+33644657808" className="hover:underline" data-testid="link-shipping-phone">+33 6 44 65 78 08</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Business Hours: Monday - Friday, 9:00 AM - 6:00 PM CET</span>
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
