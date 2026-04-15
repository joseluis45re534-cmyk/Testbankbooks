import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "blog";
  price?: string;
  salePrice?: string;
  availability?: string;
  category?: string;
  brand?: string;
  sku?: string;
  publishedDate?: string;
  authorName?: string;
}

export function SEO({
  title = "Testbankbooks - Premium Test Banks & Study Guides",
  description = "Get instant access to premium nursing test banks and study guides. Professional exam prep materials with instant digital download. Over 260+ titles available.",
  image,
  url,
  type = "website",
  price,
  salePrice,
  availability,
  category,
  brand,
  sku,
  publishedDate,
  authorName,
}: SEOProps) {
  const fullTitle = title.includes("Testbankbooks") ? title : `${title} | Testbankbooks`;
  const displayPrice = salePrice || price;

  // Build canonical URL from route path (strips ?query params so search/filter pages
  // canonicalize to the clean base URL, fixing "Duplicate without user-selected canonical").
  const [routePath] = useLocation();
  const origin = typeof window !== "undefined" ? window.location.origin : "https://testbankbooks.com";
  const canonicalUrl = url || `${origin}${routePath}`;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "OnlineBusiness",
    name: "Testbankbooks",
    url: typeof window !== "undefined" ? window.location.origin : "",
    logo: typeof window !== "undefined" ? `${window.location.origin}/favicon.png` : "",
    description: "Online retailer of digital nursing exam prep materials and test banks. Instant digital download — no physical products.",
    areaServed: "Worldwide",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5 Alvingham Ave",
      addressLocality: "Castle Douglas",
      postalCode: "DG7 1JF",
      addressCountry: "GB",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+13392284593",
      contactType: "customer service",
      email: "support@testbankbooks.com",
      availableLanguage: "English",
    },
    sameAs: [],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Testbankbooks",
    url: typeof window !== "undefined" ? window.location.origin : "",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          typeof window !== "undefined"
            ? `${window.location.origin}/shop?search={search_term_string}`
            : "/shop?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const productSchema =
    type === "product" && displayPrice
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          description: description,
          image: image,
          sku: sku || undefined,
          brand: brand
            ? { "@type": "Brand", name: brand }
            : { "@type": "Brand", name: "Testbankbooks" },
          category: category || "Test Banks",
          additionalType: "https://schema.org/DigitalDocument",
          isAccessibleForFree: false,
          offers: {
            "@type": "Offer",
            price: displayPrice,
            priceCurrency: "USD",
            availability:
              availability === "in_stock"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: {
              "@type": "Organization",
              name: "Testbankbooks",
            },
            url: canonicalUrl,
            priceValidUntil: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            )
              .toISOString()
              .split("T")[0],
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : null;

  const blogPostingSchema =
    type === "blog"
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: description,
          image: image,
          url: canonicalUrl,
          datePublished: publishedDate || new Date().toISOString().split("T")[0],
          dateModified: publishedDate || new Date().toISOString().split("T")[0],
          author: {
            "@type": "Organization",
            name: authorName || "Testbankbooks",
            url: typeof window !== "undefined" ? window.location.origin : "",
          },
          publisher: {
            "@type": "Organization",
            name: "Testbankbooks",
            logo: {
              "@type": "ImageObject",
              url: typeof window !== "undefined" ? `${window.location.origin}/favicon.png` : "",
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url || (typeof window !== "undefined" ? window.location.href : ""),
          },
        }
      : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type === "product" ? "product" : type === "blog" ? "article" : "website"} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Testbankbooks" />
      <meta property="og:locale" content="en_US" />

      {type === "product" && displayPrice && (
        <>
          <meta property="product:price:amount" content={displayPrice} />
          <meta property="product:price:currency" content="USD" />
          <meta
            property="product:availability"
            content={availability === "in_stock" ? "in stock" : "out of stock"}
          />
          {category && <meta property="product:category" content={category} />}
          {brand && <meta property="product:brand" content={brand} />}
        </>
      )}

      {type === "blog" && publishedDate && (
        <>
          <meta property="article:published_time" content={publishedDate} />
          <meta property="article:author" content={authorName || "Testbankbooks"} />
          {category && <meta property="article:section" content={category} />}
        </>
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {type === "website" && (
        <>
          <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
          <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
        </>
      )}

      {productSchema && (
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      )}

      {blogPostingSchema && (
        <script type="application/ld+json">{JSON.stringify(blogPostingSchema)}</script>
      )}
    </Helmet>
  );
}
