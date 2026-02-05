import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
  price?: string;
  salePrice?: string;
  availability?: string;
  category?: string;
  brand?: string;
  sku?: string;
  condition?: string;
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
  condition = "new",
}: SEOProps) {
  const fullTitle = title.includes("Testbankbooks") ? title : `${title} | Testbankbooks`;
  const displayPrice = salePrice || price;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Testbankbooks",
    url: typeof window !== "undefined" ? window.location.origin : "",
    logo: typeof window !== "undefined" ? `${window.location.origin}/favicon.ico` : "",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "1-800-TESTBANK",
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
          category: category || "Educational Materials",
          offers: {
            "@type": "Offer",
            price: displayPrice,
            priceCurrency: "USD",
            availability:
              availability === "in_stock"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            itemCondition:
              condition === "new"
                ? "https://schema.org/NewCondition"
                : "https://schema.org/UsedCondition",
            seller: {
              "@type": "Organization",
              name: "Testbankbooks",
            },
            url: url || (typeof window !== "undefined" ? window.location.href : ""),
            priceValidUntil: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            )
              .toISOString()
              .split("T")[0],
          },
        }
      : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url || (typeof window !== "undefined" ? window.location.href : "")} />

      <meta property="og:type" content={type === "product" ? "product" : "website"} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
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
          <meta property="product:condition" content={condition || "new"} />
          {category && <meta property="product:category" content={category} />}
          {brand && <meta property="product:brand" content={brand} />}
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
    </Helmet>
  );
}
