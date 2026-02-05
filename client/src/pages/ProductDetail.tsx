import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, ShoppingCart, Zap, Shield, CheckCircle, BookOpen, 
  ChevronLeft, ChevronRight, Download, Clock, HeadphonesIcon, 
  Star, Eye, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, CartItem } from "@shared/schema";

const faqs = [
  {
    question: "What is a test bank?",
    answer: "A test bank comprises a curated collection of exam questions and answers, designed to complement educational resources and aid in the creation of course assessments."
  },
  {
    question: "How many questions does a test bank include?",
    answer: "The number of questions in a test bank can significantly vary based on the specific resource and the publisher. Typically, test banks consist of a substantial number of questions, often ranging from several dozen to several hundred. They cover various topics and difficulty levels within a course's curriculum."
  },
  {
    question: "What question types do test banks commonly contain?",
    answer: "Test banks typically encompass multiple-choice, true/false, short answer, and essay questions. These question types evaluate different aspects of a student's understanding."
  },
  {
    question: "How can I effectively utilize a test bank for exam preparation?",
    answer: "To make efficient use of a test bank, practice answering questions regularly, review your responses, and concentrate on areas that require improvement. Simulating exam conditions can also be beneficial."
  },
  {
    question: "Are test banks identical to actual exam questions?",
    answer: "Test banks do not replicate actual exam questions precisely. However, they often address similar content and concepts, serving as valuable practice material."
  },
  {
    question: "What is the procedure for selecting and crafting questions for a test bank?",
    answer: "Subject matter experts and educators meticulously craft test bank questions. They carefully choose questions that align with the course curriculum and educational objectives."
  },
  {
    question: "How can I ensure the accuracy and reliability of questions in a test bank?",
    answer: "Test banks undergo thorough review processes to validate their accuracy and reliability. Expert educators and publishers scrutinize the questions to ensure they meet academic standards."
  },
  {
    question: "How do I receive my purchase?",
    answer: "After your purchase is complete, you'll receive an instant download link. The files will also be sent to your email for future access."
  },
  {
    question: "Can I use this on multiple devices?",
    answer: "Yes, once purchased, you can download and access your test bank on any device - computer, tablet, or smartphone."
  },
  {
    question: "Is there a money-back guarantee?",
    answer: "Yes, we offer a 30-day money-back guarantee. If you're not satisfied with your purchase, contact our support team for a full refund."
  }
];

const features = [
  "Extensive question bank covering key concepts",
  "Multiple question types including multiple-choice and short answer",
  "Aligned with curriculum and exam standards",
  "Digital format for easy access and on-the-go study",
  "Thoroughly vetted by subject matter experts",
  "Instant download after purchase"
];

const benefits = [
  "Enhances retention of complex information",
  "Boosts confidence in clinical assessment skills",
  "Facilitates active learning through interactive formats",
  "Prepares students for a variety of exam question types",
  "Supports targeted study and revision strategies",
  "Saves time with ready-to-use materials"
];

const howToSteps = [
  { title: "Download Your Test Bank", description: "Purchase and download the content directly to your device." },
  { title: "Review the Content Layout", description: "Familiarize yourself with the structure and question types included." },
  { title: "Set Study Goals", description: "Determine your objectives and identify weak areas that require more focus." },
  { title: "Practice Regularly", description: "Schedule regular practice sessions, simulating actual exam conditions." },
  { title: "Review Your Answers", description: "Critically assess your answers and review rationales to understand better." },
  { title: "Track Your Progress", description: "Keep a log of your performance to identify improvements needed." }
];

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["/api/products", params?.slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${params?.slug}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!params?.slug,
  });

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!product) return;
      return apiRequest("POST", "/api/cart", { productId: product.id, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: "Item has been added to your cart",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const allImages = useMemo(() => {
    if (!product) return [];
    const images: string[] = [];
    if (product.imageUrl) images.push(product.imageUrl);
    if (product.additionalImages && Array.isArray(product.additionalImages)) {
      images.push(...product.additionalImages);
    }
    return images;
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product || !allProducts.length) return [];
    return allProducts
      .filter(p => p.id !== product.id && p.category === product.category)
      .slice(0, 4);
  }, [product, allProducts]);

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Loading..." />
        <Header cartCount={cartCount} />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <Skeleton className="aspect-square rounded-lg" />
                <div className="flex gap-2 mt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="w-16 h-16 rounded-md" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Product Not Found" description="The product you're looking for doesn't exist." />
        <Header cartCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Link href="/shop">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shop
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const price = parseFloat(product.price);
  const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
  const hasDiscount = salePrice && salePrice < price;
  const displayPrice = hasDiscount ? salePrice : price;
  const discountPercent = hasDiscount ? Math.round((1 - salePrice / price) * 100) : 0;

  const seoTitle = `${product.title} - Instant Download`;
  const seoDescription = `${product.title}. $${displayPrice.toFixed(2)} - Instant Access for Exam Prep. Complete test bank with all chapters included.`.substring(0, 160);

  const currentImage = allImages[selectedImageIndex] || null;
  const viewingCount = Math.floor(Math.random() * 30) + 15;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        image={product.imageUrl || undefined}
        url={typeof window !== "undefined" ? `${window.location.origin}/products/${product.slug}` : undefined}
        type="product"
        price={price.toFixed(2)}
        salePrice={hasDiscount ? salePrice.toFixed(2) : undefined}
        availability={product.availability || "in_stock"}
        category={product.category || "Educational Materials"}
        brand={product.brand || "Testbankbooks"}
        sku={product.id}
        condition={product.condition || "new"}
      />
      <Header cartCount={cartCount} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/shop">
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Button>
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={`${product.title} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    data-testid="img-product-main"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
                {hasDiscount && (
                  <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-base px-3 py-1">
                    -{discountPercent}%
                  </Badge>
                )}
                <Badge variant="secondary" className="absolute top-4 right-4">
                  Digital
                </Badge>
                
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                      onClick={handlePrevImage}
                      data-testid="button-prev-image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                      onClick={handleNextImage}
                      data-testid="button-next-image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2" data-testid="gallery-thumbnails">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                        index === selectedImageIndex
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/50"
                      }`}
                      data-testid={`button-thumbnail-${index}`}
                    >
                      <img
                        src={img}
                        alt={`${product.title} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {product.category && (
                <Link href={`/shop?category=${encodeURIComponent(product.category)}`}>
                  <Badge variant="outline" className="text-primary border-primary hover:bg-primary/10 cursor-pointer">
                    {product.category}
                  </Badge>
                </Link>
              )}

              <h1 className="text-2xl md:text-3xl font-bold leading-tight" data-testid="text-product-title">
                {product.title}
              </h1>

              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <span className="text-sm font-medium">4.9</span>
                <span className="text-sm text-muted-foreground">· 128 reviews</span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-bold text-primary" data-testid="text-product-price">
                  ${displayPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${price.toFixed(2)}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground" data-testid="text-product-description">
                  {product.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="text-green-600 font-medium">Only a few left in stock!</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {viewingCount} people viewing now
                </span>
              </div>

              <Button
                size="lg"
                className="w-full text-lg h-14"
                onClick={() => addToCartMutation.mutate()}
                disabled={addToCartMutation.isPending}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {addToCartMutation.isPending ? "Adding to Cart..." : "Add to Cart"}
              </Button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Lock className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">100% Secure</p>
                  <p className="text-xs text-muted-foreground">256-bit SSL</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">Instant Access</p>
                  <p className="text-xs text-muted-foreground">Download now</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">Money Back</p>
                  <p className="text-xs text-muted-foreground">30-day guarantee</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <HeadphonesIcon className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">24/7 Support</p>
                  <p className="text-xs text-muted-foreground">We're here</p>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">1 Digital Download Included</p>
                      <p className="text-sm text-muted-foreground">Instant access after purchase. Download links sent to your email.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-16 space-y-16">
            <section>
              <h2 className="text-2xl font-bold mb-6">Product Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                The {product.title} is an essential resource designed for nursing, medical, and health science students aiming for success in their academic pursuits. This comprehensive test bank, expertly curated with a multitude of questions and concepts, allows students to effectively prepare for nursing exam prep and clinical assessments. Crafted by experienced educators and medical professionals, it serves as a vital study guide for mastering complex topics. By utilizing this test bank, students can enhance their understanding of critical material, practice effectively, and boost their confidence as they tackle exam challenges.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6">Key Features & Benefits</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Features</h3>
                    <ul className="space-y-3">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Benefits</h3>
                    <ul className="space-y-3">
                      {benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6">How to Use This Test Bank for Success</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {howToSteps.map((step, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{step.title}</h4>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <Card key={index} className="overflow-hidden">
                    <button
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      data-testid={`button-faq-${index}`}
                    >
                      <span className="font-medium">{faq.question}</span>
                      {expandedFaq === index ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-4">
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>

            {relatedProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Students Also Viewed</h2>
                  <Link href={`/shop?category=${encodeURIComponent(product.category || '')}`}>
                    <Button variant="outline">View All</Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {relatedProducts.map((relatedProduct) => {
                    const relPrice = parseFloat(relatedProduct.price);
                    const relSalePrice = relatedProduct.salePrice ? parseFloat(relatedProduct.salePrice) : null;
                    const relHasDiscount = relSalePrice && relSalePrice < relPrice;
                    const relDiscountPercent = relHasDiscount ? Math.round((1 - relSalePrice / relPrice) * 100) : 0;

                    return (
                      <Link key={relatedProduct.id} href={`/products/${relatedProduct.slug}`}>
                        <Card className="hover-elevate cursor-pointer h-full overflow-hidden group">
                          <div className="relative aspect-square bg-muted">
                            {relatedProduct.imageUrl ? (
                              <img
                                src={relatedProduct.imageUrl}
                                alt={relatedProduct.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                            {relHasDiscount && (
                              <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                                -{relDiscountPercent}%
                              </Badge>
                            )}
                            <Badge variant="secondary" className="absolute top-2 right-2">
                              Digital
                            </Badge>
                          </div>
                          <CardContent className="p-3">
                            {relatedProduct.category && (
                              <p className="text-xs text-primary mb-1">{relatedProduct.category}</p>
                            )}
                            <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                              {relatedProduct.title}
                            </h3>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="w-3 h-3 fill-primary text-primary" />
                              <span className="text-xs">4.9</span>
                              <span className="text-xs text-muted-foreground">(128)</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-primary">
                                ${(relHasDiscount ? relSalePrice : relPrice).toFixed(2)}
                              </span>
                              {relHasDiscount && (
                                <span className="text-sm text-muted-foreground line-through">
                                  ${relPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
