import { BookOpen, Shield, CreditCard, Zap, Mail, Phone } from "lucide-react";
import { SiVisa, SiMastercard, SiPaypal } from "react-icons/si";

export function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Testbankbooks</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your trusted source for premium nursing test banks and study guides. Instant digital downloads for exam preparation.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/" className="hover:text-foreground transition-colors">All Products</a></li>
              <li><a href="/cart" className="hover:text-foreground transition-colors">Shopping Cart</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
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
                <span>1-800-TESTBANK</span>
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
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>SSL Encrypted</span>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Testbankbooks. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
