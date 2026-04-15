import { Shield, CreditCard, Zap, Mail, Phone, MapPin } from "lucide-react";
import { SiVisa, SiMastercard, SiPaypal, SiApplepay, SiGooglepay } from "react-icons/si";

export function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center">
              <img src="/logo.png" alt="Testbankbooks - Your Key to Exam Success" className="h-10 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your trusted source for premium nursing exam prep materials and study guides. Instant digital downloads for exam preparation.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-foreground transition-colors">All Products</a></li>
              <li><a href="/blog" className="hover:text-foreground transition-colors">Study Guides</a></li>
              <li><a href="/about" className="hover:text-foreground transition-colors">About Us</a></li>
              <li><a href="/cart" className="hover:text-foreground transition-colors">Shopping Cart</a></li>
              <li><a href="/contact" className="hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="/terms-conditions" className="hover:text-foreground transition-colors">Terms & Conditions</a></li>
              <li><a href="/refund-policy" className="hover:text-foreground transition-colors">Refund & Return Policy</a></li>
              <li><a href="/shipping-policy" className="hover:text-foreground transition-colors">Shipping Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>support@testbankbooks.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:+13392284593" className="hover:text-foreground transition-colors">+1 (339) 228-4593</a>
              </li>
              <li className="flex items-start gap-2 mt-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <div>5 Alvingham Ave</div>
                  <div>Castle Douglas DG7 1JF</div>
                  <div>United Kingdom</div>
                </div>
              </li>
            </ul>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                <span>Instant Download</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>Secure Payment</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">We Accept</h4>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                <SiVisa className="w-8 h-5 text-[#1434CB]" />
              </div>
              <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                <SiMastercard className="w-8 h-5 text-[#EB001B]" />
              </div>
              <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                <SiPaypal className="w-8 h-5 text-[#00457C]" />
              </div>
              <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                <SiApplepay className="w-8 h-5 text-foreground" />
              </div>
              <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                <SiGooglepay className="w-8 h-5 text-foreground" />
              </div>
              <div className="w-12 h-8 bg-background rounded border flex items-center justify-center text-xs font-semibold text-[#00D66F]">
                Link
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>SSL Encrypted</span>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Testbankbooks. All rights reserved.</p>
          <p className="mt-2">
            <a href="/admin" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">Admin</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
