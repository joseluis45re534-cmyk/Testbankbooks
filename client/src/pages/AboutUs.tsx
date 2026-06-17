import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Shield, Zap, HeadphonesIcon, CheckCircle, Users, Award, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutUs() {
  const { data: cartItems = [] } = useQuery<any[]>({ queryKey: ["/api/cart"] });
  const cartCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="About Us | NursTestBank - Nursing Exam Prep Materials"
        description="Learn about NursTestBank — a dedicated online store providing premium nursing exam prep materials and study guides for nursing and healthcare students worldwide."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">About NursTestBank</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We provide premium exam preparation materials and study resources to help nursing and healthcare students succeed in their academic journey.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-2xl font-bold mb-4">Who We Are</h2>
                <p className="text-muted-foreground mb-4">
                  NursTestBank is a dedicated retailer of printed study books and exam preparation guides for nursing and healthcare students. Every order is a professionally printed book that we ship to your door, with a complimentary digital copy emailed so you can begin studying right away.
                </p>
                <p className="text-muted-foreground mb-4">
                  Our catalog includes over 300 study titles covering all major nursing disciplines — from Anatomy &amp; Physiology to Medical-Surgical Nursing, Pharmacology, Pediatrics, and more. Each book ships with free standard shipping and a tracking number.
                </p>
                <p className="text-muted-foreground">
                  We believe every student deserves access to high-quality study resources. That's why we offer competitive pricing, free shipping, and a 30-day money-back guarantee on all purchases.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Our Business Model</h2>
                <p className="text-muted-foreground mb-4">
                  NursTestBank sells professionally printed study books. Every order is printed and shipped to the customer's address with free standard shipping, and we include a complimentary digital copy by email so customers can start studying immediately while their book is in transit. Customers receive a tracking number once their order ships.
                </p>
                <p className="text-muted-foreground mb-4">
                  We accept major credit cards (via Stripe), PayPal, and other digital payment methods. All transactions are secured with SSL encryption.
                </p>
                <p className="text-muted-foreground">
                  Customer support is available via email at <a href="mailto:support@nurstestbank.com" className="text-primary hover:underline">support@nurstestbank.com</a> and by phone at <a href="tel:+13303908394" className="text-primary hover:underline">+1 (330) 390-8394</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10">What We Stand For</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Transparency</h3>
                  <p className="text-sm text-muted-foreground">Clear pricing, honest policies, no hidden fees</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Security</h3>
                  <p className="text-sm text-muted-foreground">SSL-encrypted payments and secure file delivery</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Speed</h3>
                  <p className="text-sm text-muted-foreground">Instant delivery — access your materials right away</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <HeadphonesIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Support</h3>
                  <p className="text-sm text-muted-foreground">Dedicated customer support team to help you</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10">By the Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-1">300+</div>
                <div className="text-sm text-muted-foreground">Study Materials</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-1">30</div>
                <div className="text-sm text-muted-foreground">Day Money-Back</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Customer Support</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Digital Delivery</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">Contact & Business Information</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3">Business Details</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><span className="font-medium text-foreground">Business Name:</span> NursTestBank</li>
                  <li><span className="font-medium text-foreground">Type:</span> Online retailer of printed study books</li>
                  <li><span className="font-medium text-foreground">Products:</span> Printed nursing study books (free digital copy included)</li>
                  <li><span className="font-medium text-foreground">Delivery:</span> Free worldwide shipping on printed books + free digital copy</li>
                  <li><span className="font-medium text-foreground">Registered Address:</span> 7 Rue des Noyers, 69005 Lyon, France</li>
                  <li><span className="font-medium text-foreground">Markets Served:</span> Worldwide (international shipping)</li>
                  <li><span className="font-medium text-foreground">Currency:</span> All prices in US Dollars (USD)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Get in Touch</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">Email: </span>
                    <a href="mailto:support@nurstestbank.com" className="text-primary hover:underline">support@nurstestbank.com</a>
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Phone: </span>
                    <a href="tel:+13303908394" className="text-primary hover:underline">+1 (330) 390-8394</a>
                  </li>
                  <li><span className="font-medium text-foreground">Hours:</span> Mon–Fri, 9:00 AM – 6:00 PM CET</li>
                  <li>
                    <span className="font-medium text-foreground">Support Page: </span>
                    <a href="/contact" className="text-primary hover:underline">Contact Us</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
