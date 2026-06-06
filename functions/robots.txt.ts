export const onRequest: PagesFunction = async () => {
  const txt = `User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /checkout
Disallow: /thank-you
Disallow: /api/

User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /checkout
Disallow: /thank-you
Disallow: /api/

Sitemap: https://nurstestbank.com/sitemap.xml
`;
  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
