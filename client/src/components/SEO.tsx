import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
  price?: string;
  availability?: string;
}

export function SEO({
  title = "Testbankbooks - Premium Test Banks & Study Guides",
  description = "Get instant access to premium nursing test banks and study guides. Professional exam prep materials with instant digital download. Over 260+ titles available.",
  image,
  url,
  type = "website",
  price,
  availability,
}: SEOProps) {
  const fullTitle = title.includes("Testbankbooks") ? title : `${title} | Testbankbooks`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content="Testbankbooks" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      
      {/* Product specific meta for JSON-LD */}
      {type === "product" && price && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: title,
            description: description,
            image: image,
            offers: {
              "@type": "Offer",
              price: price,
              priceCurrency: "USD",
              availability: availability === "in_stock" 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock",
              seller: {
                "@type": "Organization",
                name: "Testbankbooks"
              }
            }
          })}
        </script>
      )}
    </Helmet>
  );
}
