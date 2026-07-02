import { useQuery } from "@tanstack/react-query";
import { Shield, Mail, Phone, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import type { CartItem } from "@shared/schema";

export default function RefundPolicy() {
  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Refund Policy"
        description="NursTestBank offers a 30-day money-back guarantee on all orders. Learn about our refund and return conditions and how to request a refund."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-refund-title">Refund Policy</h1>
              <p className="text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">30-Day Money-Back Guarantee</h2>
              </div>
              <p className="text-muted-foreground">
                At NursTestBank, we stand behind the quality of our products. We offer a 30-day money-back guarantee on all purchases. If you are not completely satisfied with your purchase, you may request a full refund within 30 days of your original purchase date.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Eligibility for Refund</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>To be eligible for a refund, the following conditions must be met:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The refund request is made within 30 days of the original purchase date</li>
                  <li>You provide your order number and the email address used for the purchase</li>
                  <li>You provide a valid reason for the refund request</li>
                </ul>
                <p>We process refunds and returns on a case-by-case basis to ensure fair use of our guarantee while protecting against misuse.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Refund & Return Conditions</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>Because each order is for a digital product, valid reasons for a refund or return include:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The product does not match its description or listing</li>
                  <li>The digital file is corrupted or cannot be opened</li>
                  <li>Duplicate purchase of the same product</li>
                  <li>The product does not correspond to the correct textbook edition</li>
                  <li>You were unable to download the file despite following troubleshooting steps</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. How to Request a Refund</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>To request a refund, please follow these steps:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>
                    <strong className="text-foreground">Contact our support team</strong> at{" "}
                    <a href="mailto:support@nurstestbank.com" className="text-primary hover:underline" data-testid="link-refund-email">support@nurstestbank.com</a>{" "}
                    or call <a href="tel:+33412345678" className="text-primary hover:underline" data-testid="link-refund-phone">+33 4 12 34 56 78</a>
                  </li>
                  <li>
                    <strong className="text-foreground">Include your order details:</strong> order number, email address used for purchase, and product name
                  </li>
                  <li>
                    <strong className="text-foreground">Describe the reason</strong> for your refund request
                  </li>
                  <li>
                    <strong className="text-foreground">Wait for confirmation:</strong> Our team will review your request and respond within 24-48 hours
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Refund Processing Time</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p>Once your refund is approved:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li><strong className="text-foreground">Review Period:</strong> 24-48 business hours for refund request review</li>
                      <li><strong className="text-foreground">Processing:</strong> 3-5 business days for the refund to be processed</li>
                      <li><strong className="text-foreground">Bank Processing:</strong> 5-10 business days for the refund to appear on your statement, depending on your financial institution</li>
                    </ul>
                    <p className="mt-2">Refunds are issued to the original payment method used at checkout.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Exceptions & Non-Refundable Situations</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>Refunds may be declined in the following situations:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The refund request is submitted more than 30 days after the purchase date</li>
                  <li>Evidence of misuse, redistribution, or sharing of the purchased materials</li>
                  <li>Multiple refund requests from the same account within a short period (indicating potential abuse)</li>
                  <li>The customer has previously received a refund for the same product</li>
                  <li>The product was purchased during a clearly marked "final sale" or non-refundable promotion</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Partial Refunds</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>In certain circumstances, we may offer partial refunds:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>If only a portion of a bundle or multi-product order is found to be unsatisfactory</li>
                  <li>If the product has been partially used and a full refund is not warranted</li>
                  <li>At our discretion when circumstances do not meet full refund criteria but some compensation is appropriate</li>
                </ul>
                <p>The partial refund amount will be determined on a case-by-case basis by our support team.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Chargebacks</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  We encourage customers to contact us directly before initiating a chargeback with their bank or credit card company. We are committed to resolving issues promptly and fairly. Initiating a chargeback without first contacting our support team may result in:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Revocation of download access to all purchased products</li>
                  <li>Suspension of your account</li>
                  <li>Additional fees associated with the chargeback process</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Contact for Refunds</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>For all refund-related inquiries, please reach out to us through any of the following channels:</p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href="mailto:support@nurstestbank.com" className="hover:underline" data-testid="link-refund-contact-email">support@nurstestbank.com</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href="tel:+33412345678" className="hover:underline" data-testid="link-refund-contact-phone">+33 4 12 34 56 78</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Business Hours: Monday - Friday, 9:00 AM - 6:00 PM CET</span>
                  </div>
                </div>
                <p className="mt-4 text-muted-foreground">
                  <strong className="text-foreground">NursTestBank</strong><br />
                  7 Rue des Noyers, 69005 Lyon, France
                </p>
                <p className="mt-4">Our customer support team is dedicated to ensuring your satisfaction and will work with you to resolve any issues promptly.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
