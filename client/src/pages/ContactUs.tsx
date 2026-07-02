import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Phone, Clock, MapPin, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CartItem } from "@shared/schema";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactUs() {
  const { toast } = useToast();

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      return apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Thank you for contacting us! We will respond within 24 hours.",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again or email us directly.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Contact Us"
        description="Get in touch with NursTestBank support. We're here to help with orders, refunds, download issues, and more. Response within 24 hours."
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-contact-title">Contact Us</h1>
            <p className="text-muted-foreground text-lg">
              Have a question or need assistance? We're here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <Card>
              <CardContent className="pt-6 text-center">
                <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
                <h2 className="font-semibold mb-1">Email Us</h2>
                <a
                  href="mailto:support@nurstestbank.com"
                  className="text-muted-foreground hover:underline text-sm"
                  data-testid="link-contact-email"
                >
                  support@nurstestbank.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
                <h2 className="font-semibold mb-1">Call Us</h2>
                <a
                  href="tel:+33412345678"
                  className="text-muted-foreground hover:underline text-sm"
                  data-testid="link-contact-phone"
                >
                  +33 4 12 34 56 78
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
                <h2 className="font-semibold mb-1">Location</h2>
                <p className="text-muted-foreground text-sm" data-testid="text-contact-address">7 Rue des Noyers<br />69005 Lyon<br />France</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                <h2 className="font-semibold mb-1">Business Hours</h2>
                <p className="text-muted-foreground text-sm">Mon - Fri, 9AM - 6PM CET</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Your full name"
                        {...form.register("name")}
                        data-testid="input-contact-name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive" data-testid="error-contact-name">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        {...form.register("email")}
                        data-testid="input-contact-email"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive" data-testid="error-contact-email">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="How can we help?"
                        {...form.register("subject")}
                        data-testid="input-contact-subject"
                      />
                      {form.formState.errors.subject && (
                        <p className="text-sm text-destructive" data-testid="error-contact-subject">
                          {form.formState.errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        {...form.register("message")}
                        data-testid="input-contact-message"
                      />
                      {form.formState.errors.message && (
                        <p className="text-sm text-destructive" data-testid="error-contact-message">
                          {form.formState.errors.message.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={contactMutation.isPending}
                      data-testid="button-contact-submit"
                    >
                      {contactMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Response Time</p>
                      <p className="text-muted-foreground text-sm">We respond to all inquiries within 24 hours during business days.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Live Chat</p>
                      <p className="text-muted-foreground text-sm">Use the chat widget in the bottom-right corner for instant support during business hours.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Phone</p>
                      <a href="tel:+33412345678" className="text-muted-foreground text-sm hover:underline" data-testid="link-contact-phone-sidebar">+33 4 12 34 56 78</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Service Area</p>
                      <p className="text-muted-foreground text-sm">Online Business — Worldwide Digital Delivery</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Inquiries</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">Order Issues</p>
                    <p>Include your order number for faster resolution.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Download Problems</p>
                    <p>Provide the product name and error message you received.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Refund Requests</p>
                    <p>Include your order number and reason for the request.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Product Questions</p>
                    <p>Let us know the textbook title and edition you need.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
