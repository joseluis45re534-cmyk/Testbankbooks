# Testbankbooks — Developer README

A full-stack e-commerce platform for nursing test banks and study guides. Built with React, Express.js, and PostgreSQL.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [Frontend](#frontend)
8. [Backend](#backend)
9. [Admin Panel](#admin-panel)
10. [Payment Gateways](#payment-gateways)
11. [Email System](#email-system)
12. [Live Chat & Chatbot](#live-chat--chatbot)
13. [Blog System](#blog-system)
14. [SEO](#seo)
15. [Product Import](#product-import)
16. [Media & File Management](#media--file-management)
17. [Abandoned Cart Tracking](#abandoned-cart-tracking)
18. [Deployment](#deployment)

---

## Project Overview

Testbankbooks sells downloadable nursing test banks. Customers browse products, add them to their cart, pay via Stripe or PayPal, and immediately receive an email with a download link. The site runs at **https://testbankbooks.com**.

Key features:
- Product catalog imported from an external Google Shopping XML feed
- Stripe and PayPal checkout with order confirmation emails
- Downloadable digital products (ZIP/PDF files stored in `/uploads/`)
- Auto-generated blog posts (SEO study guides) for every product
- Live chat widget with a built-in chatbot and admin inbox
- Abandoned cart tracking and recovery emails
- Full admin panel (dashboard, orders, products, blog, SEO, media, chat, settings)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Wouter, TanStack React Query, Shadcn/ui, Tailwind CSS |
| Backend | Express.js 5 + TypeScript, Node.js |
| Database | PostgreSQL via Drizzle ORM |
| Payments | Stripe, PayPal |
| Email | Resend |
| Session storage | connect-pg-simple (PostgreSQL-backed sessions) |
| Build tools | Vite (frontend), esbuild (server bundle) |

---

## Project Structure

```
.
├── client/                     # React frontend
│   └── src/
│       ├── components/         # Shared UI components
│       │   ├── ui/             # Shadcn/Radix UI primitives
│       │   ├── Header.tsx
│       │   ├── Footer.tsx
│       │   ├── ProductCard.tsx
│       │   ├── ProductGrid.tsx
│       │   ├── CategorySidebar.tsx
│       │   ├── ChatWidget.tsx  # Customer-facing live chat
│       │   ├── StripeCheckout.tsx
│       │   ├── PayPalButton.tsx
│       │   └── SEO.tsx         # Per-page meta tags
│       ├── hooks/
│       │   ├── use-toast.ts
│       │   └── use-mobile.tsx
│       ├── lib/
│       │   ├── queryClient.ts  # TanStack Query client + apiRequest helper
│       │   ├── analytics.ts
│       │   └── utils.ts
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── Shop.tsx
│       │   ├── ProductDetail.tsx
│       │   ├── Cart.tsx
│       │   ├── Checkout.tsx    # Multi-step checkout (email → payment)
│       │   ├── ThankYou.tsx    # Post-payment download page
│       │   ├── Blog.tsx
│       │   ├── BlogPost.tsx
│       │   ├── AboutUs.tsx
│       │   ├── ContactUs.tsx
│       │   ├── PrivacyPolicy.tsx
│       │   ├── TermsConditions.tsx
│       │   ├── RefundPolicy.tsx
│       │   ├── ShippingPolicy.tsx
│       │   └── admin/          # Admin pages (see Admin Panel section)
│       └── App.tsx             # Route definitions
│
├── server/                     # Express backend
│   ├── index.ts                # Entry point, startup migrations, session config
│   ├── routes.ts               # All API route handlers (~2000 lines)
│   ├── storage.ts              # Data access layer (IStorage interface + DB impl)
│   ├── db.ts                   # Drizzle ORM instance + connection pool
│   ├── email.ts                # Order confirmation + abandoned cart emails (Resend)
│   ├── stripe.ts               # Stripe PaymentIntent creation
│   ├── paypal.ts               # PayPal order creation + capture
│   ├── chatbot.ts              # Auto-responder logic for live chat
│   ├── blogGenerator.ts        # Generates SEO blog posts from product data
│   ├── xmlParser.ts            # Fetches + imports products from XML feed
│   ├── csvParser.ts            # Alternative CSV import
│   ├── mediaDownloader.ts      # Bulk image/file download from external URLs
│   ├── scheduler.ts            # Periodic tasks (abandoned cart detection, etc.)
│   ├── static.ts               # Custom HTML injection + static file serving
│   ├── settingsHelper.ts       # Reads site_settings from DB
│   ├── vite.ts                 # Vite dev server integration
│   └── woocommerce.ts          # WooCommerce helper (legacy signed URLs)
│
├── shared/
│   └── schema.ts               # Drizzle table definitions + Zod schemas (source of truth)
│
├── uploads/                    # Self-hosted product images + downloadable files
│   ├── images/
│   └── downloads/
│
├── drizzle.config.ts           # Drizzle Kit config (do not modify)
├── vite.config.ts              # Vite config (do not modify)
└── package.json                # Scripts (do not modify)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (a `DATABASE_URL` env var is required)

### Install & Run (development)

```bash
npm install
npm run dev       # Starts Express + Vite dev server on port 5000
```

The backend and frontend share port **5000**. Vite proxies are not used — the Express server serves both the API (`/api/*`) and the compiled React app.

### Build (production)

```bash
npm run build     # Bundles server to dist/index.cjs and builds frontend
npm run start     # Runs the production bundle
```

### Database migrations

```bash
npm run db:push   # Push schema changes to the database (uses Drizzle Kit)
```

> **Note:** `drizzle.config.ts` reads `DATABASE_URL` from the environment. Do not modify this file.

---

## Environment Variables

All secrets are stored as environment variables. Never commit them.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing Express sessions |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side publishable key |
| `PAYPAL_CLIENT_ID` | PayPal API client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal API client secret |
| `RESEND_API_KEY` | Resend email service API key |
| `WC_URL` | WooCommerce store URL (legacy, for signed URL generation) |
| `WC_KEY` | WooCommerce consumer key |
| `WC_SECRET` | WooCommerce consumer secret |

---

## Database

### ORM

Drizzle ORM is used for all database access. The schema is the single source of truth in **`shared/schema.ts`**.

### Tables

| Table | Purpose |
|---|---|
| `products` | Product catalog (title, price, category, image, download path, slug) |
| `cart_items` | Shopping cart items per session |
| `orders` | Completed orders with payment info and customer details |
| `order_items` | Line items for each order |
| `abandoned_carts` | Cart sessions where the customer did not complete payment |
| `blog_posts` | Auto-generated SEO blog posts, one per product |
| `admin_users` | Admin accounts (bcrypt-hashed passwords) |
| `site_settings` | Key-value store for site-wide config (logo, announcement bar, etc.) |
| `payment_settings` | Per-provider config (Stripe/PayPal enabled flags and keys) |
| `seo_keywords` | Keywords used for blog post generation |
| `tags` | Product tags |
| `chat_conversations` | Live chat sessions (one per visitor session) |
| `chat_messages` | Individual messages within a conversation |
| `security_migrations` | Marker rows to gate one-time startup migrations |
| `custom_html_blocks` | Admin-injected `<head>`/`<body>` HTML snippets |

### Storage interface

All database reads and writes go through `server/storage.ts`. The `IStorage` interface defines every operation. Routes should never query the DB directly — they call `storage.*` methods only.

```
storage.getProducts(filters)
storage.getCartItems(sessionId)
storage.createOrder(data)
storage.clearCart(sessionId)       // also deletes abandoned_carts for that session
storage.getAbandonedCarts()
...
```

---

## Frontend

### Routing (`client/src/App.tsx`)

| Path | Page |
|---|---|
| `/` | Landing page |
| `/shop` | Product catalog with search/filter |
| `/product/:slug` | Product detail page |
| `/cart` | Shopping cart |
| `/checkout` | Multi-step checkout |
| `/thank-you/:orderId` | Post-payment confirmation + download links |
| `/blog` | Blog listing |
| `/blog/:slug` | Individual blog post |
| `/about` | About Us |
| `/contact` | Contact Us |
| `/privacy-policy` | Privacy Policy |
| `/terms` | Terms & Conditions |
| `/refund-policy` | Refund Policy |
| `/shipping-policy` | Shipping Policy |
| `/admin/*` | Admin panel (requires auth cookie) |

### Data fetching

All API calls use **TanStack React Query v5** via the pre-configured `queryClient` in `client/src/lib/queryClient.ts`.

- `useQuery` for reads — no `queryFn` needed; the default fetcher calls `GET /api/<path>` automatically
- `useMutation` with `apiRequest` from `@lib/queryClient` for writes (POST/PATCH/DELETE)
- Always invalidate the relevant query cache after mutations

```tsx
const { data } = useQuery({ queryKey: ['/api/products'] });

const mutation = useMutation({
  mutationFn: () => apiRequest('POST', '/api/cart', { productId, quantity: 1 }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/cart'] }),
});
```

### Checkout flow

1. `Checkout.tsx` — Step 1: customer enters name, email, phone → `POST /api/cart/email` (immediately records abandoned cart)
2. Step 2: Stripe `PaymentElement` or PayPal button
3. On success → redirect to `/thank-you/:orderId`
4. `ThankYou.tsx` — shows order summary + download button linking to `/thank-you/:orderId`

---

## Backend

### API routes (`server/routes.ts`)

All routes are registered in a single `registerRoutes(app)` export.

**Public**
- `GET /api/products` — product list with search, category, page filters
- `GET /api/products/:slug` — single product
- `GET /api/categories` — category list with counts
- `GET /api/cart` — current session cart
- `POST /api/cart` — add item
- `DELETE /api/cart/:id` — remove item
- `POST /api/cart/email` — save customer contact info + immediately record abandoned cart
- `POST /api/checkout/stripe` — create Stripe PaymentIntent
- `POST /api/checkout/paypal` — create PayPal order
- `POST /api/checkout/paypal/capture` — capture PayPal payment
- `POST /api/stripe/webhook` — Stripe webhook (payment success handling)
- `GET /api/orders/:id` — fetch order by ID (used on thank-you page)
- `GET /api/blog` / `GET /api/blog/:slug` — blog listing and detail
- `GET /api/sitemap` — dynamic XML sitemap
- `GET /robots.txt` — robots directives
- `GET /api/chat/*` — live chat endpoints
- `POST /api/chat/message` — send a visitor message (triggers bot reply)

**Admin** (require `requireAdmin` middleware — session-based)
- `POST /api/admin/login` / `POST /api/admin/logout`
- `GET /api/admin/orders` — order list with filters
- `POST /api/admin/orders/:id/resend-email` — resend order confirmation email
- `GET /api/admin/abandoned-carts` — abandoned cart list
- `POST /api/admin/abandoned-carts/:id/send-recovery` — send recovery email
- `GET /api/admin/products` / `POST` / `PATCH` / `DELETE` — product CRUD
- `GET /api/admin/blog` / `POST` / `PATCH` / `DELETE` — blog CRUD
- `GET /api/admin/seo-keywords` / `POST` / `DELETE` — SEO keyword management
- `GET /api/admin/dashboard` — summary stats
- `GET/POST /api/admin/settings` — site settings
- `GET/POST /api/admin/payment-settings` — payment provider config
- `GET /api/admin/chat/*` — admin chat inbox
- `POST /api/admin/chat/:id/reply` — admin reply (silences bot for 12 h)
- `POST /api/admin/import-xml` — trigger product XML re-import
- `POST /api/admin/media/*` — bulk image/file download management

---

## Admin Panel

Access at `/admin`. Default admin username: **soufiane66** (password stored as bcrypt hash in `admin_users` table).

| Admin Page | File | Purpose |
|---|---|---|
| Dashboard | `AdminDashboard.tsx` | Revenue stats, recent orders, quick links |
| Orders | `AdminOrders.tsx` | Order list, detail view, resend email button |
| Products | `AdminProducts.tsx` | Product CRUD, download file upload, bulk actions |
| Blog | `AdminBlog.tsx` | Blog post management, auto-generation trigger |
| SEO | `AdminSEO.tsx` | SEO keyword management |
| Media | `AdminMedia.tsx` | Bulk image/download file management |
| Downloads | `AdminDownloads.tsx` | Per-product download file upload |
| Chat | `AdminChat.tsx` | Live chat inbox, admin reply |
| Settings | `AdminSettings.tsx` | Logo, announcement bar, custom HTML, payment toggles |
| Login | `AdminLogin.tsx` | Auth form |

---

## Payment Gateways

Both gateways are toggled from Admin → Settings → Payment Settings.

### Stripe

- Server: `server/stripe.ts` — `createStripePaymentIntent(amount, currency, metadata)`
- Client: `client/src/components/StripeCheckout.tsx` — uses `@stripe/stripe-js` `PaymentElement`
- Billing address is collected automatically via `fields.billingDetails.address: "auto"`
- Order is created on the server in the Stripe webhook (`POST /api/stripe/webhook`) after `payment_intent.succeeded`

### PayPal

- Server: `server/paypal.ts` — `createPaypalOrder` / `capturePaypalOrderDirect`
- Client: `client/src/components/PayPalButton.tsx`
- Order is created after successful PayPal capture in `POST /api/checkout/paypal/capture`

---

## Email System

Powered by **Resend** (`server/email.ts`). Sender address: `support@testbankbooks.com`.

### Order confirmation

Sent after every successful payment. Contains:
- Order ID and total
- List of purchased products
- A prominent **"Access My Downloads"** button linking to `https://testbankbooks.com/thank-you/{orderId}`

Local `/uploads/...` paths in `download_path` are expanded to full `https://testbankbooks.com/uploads/...` URLs using the `normalizeDownloadUrl` helper.

### Abandoned cart recovery

`sendAbandonedCartRecoveryEmail(cart)` — triggered manually from the admin panel. Sends a coupon-style reminder to the customer's email.

### Resend email (admin)

`POST /api/admin/orders/:id/resend-email` — admin can retrigger the confirmation email for any order from the Orders page.

---

## Live Chat & Chatbot

### Customer widget

`client/src/components/ChatWidget.tsx` — floating chat bubble on every page. Visitors can type messages. URLs in bot messages are rendered as clickable links.

### Bot logic (`server/chatbot.ts`)

- Sends a **welcome message** when a conversation is created
- Auto-responds to common questions: delivery, downloads, payments, refunds, pricing
- When asked about a specific download, looks up the visitor's orders by email and returns real clickable download links
- **Silences itself for 12 hours** after a human admin replies to prevent bot/human conflicts
- Visitors can type **"agent"** at any time to request a human

### Sender types

| `senderType` | Meaning |
|---|---|
| `"visitor"` | Customer message |
| `"bot"` | Automated chatbot reply |
| `"admin"` | Human admin reply |

### Admin inbox

`client/src/pages/admin/AdminChat.tsx` — lists all conversations, shows messages, and lets the admin reply. An admin reply silences the bot for 12 hours for that conversation.

---

## Blog System

Every product gets an auto-generated SEO study guide blog post stored in the `blog_posts` table.

- **Generator:** `server/blogGenerator.ts` — takes a product and returns structured blog content (title, meta description, body HTML, slug)
- **Auto-generation on startup:** `server/index.ts` calls `generateMissingBlogPosts()` at startup to fill any gaps
- **Manual trigger:** Admin → Blog → "Generate Missing Posts" button
- **SEO keywords:** Admin → SEO → add keywords that are woven into generated content

Blog posts are publicly accessible at `/blog` (listing) and `/blog/:slug` (detail).

---

## SEO

Every page renders meta tags via `react-helmet-async` using the `SEO` component (`client/src/components/SEO.tsx`):

- `<title>`, `<meta name="description">`, canonical URL
- Open Graph tags (`og:title`, `og:description`, `og:image`)
- JSON-LD structured data (Product, Organization, WebSite schemas)

**Sitemap:** `GET /api/sitemap` returns a dynamic XML sitemap including all products and blog posts.

**robots.txt:** served at `/robots.txt` with proper directives.

---

## Product Import

Products are sourced from an external Google Shopping XML feed.

- **Parser:** `server/xmlParser.ts` — `fetchAndImportProducts()` fetches the feed, parses each `<item>`, extracts title/price/category/image/download URL, cleans data, and upserts into the `products` table
- **On startup:** `server/index.ts` calls this if the DB has fewer than 300 products
- **Manual trigger:** Admin → Products → "Re-import XML" button → `POST /api/admin/import-xml`
- Categories are extracted automatically from the feed and stored on each product

---

## Media & File Management

Product images and downloadable files are stored locally in `/uploads/`.

```
uploads/
├── images/         # Product images (served at /uploads/images/*)
└── downloads/      # Downloadable ZIP/PDF files (served at /uploads/downloads/*)
```

### Bulk download (admin)

`server/mediaDownloader.ts` handles bulk downloading of external image URLs or file URLs:
- `startBulkImageDownload()` — downloads all product images from external URLs into `/uploads/images/`
- `startBulkFileDownload()` — downloads all product files into `/uploads/downloads/`
- Progress is tracked in memory and polled by the admin UI

### Per-product upload (admin)

Admin → Products → upload a new image or download file for a specific product via multipart form. Stored in `/uploads/` and the product's `imageUrl` or `downloadPath` is updated.

---

## Abandoned Cart Tracking

When a customer starts checkout but doesn't pay:

1. **Immediate capture:** `POST /api/cart/email` (called when customer clicks "Continue to Payment") immediately creates a row in `abandoned_carts` with their name, email, phone, cart items, and total. If a row already exists for the session it is updated.

2. **Anonymous detection:** `server/scheduler.ts` also runs `detectAndRecordAbandonedCarts(60)` periodically, which captures sessions that have been idle for 60+ minutes but never submitted their email (anonymous carts).

3. **Admin view:** Admin → Abandoned Carts — shows all captured carts with customer info, total, and a button to send a recovery email.

4. **Cleanup on purchase:** `storage.clearCart(sessionId)` deletes both the `cart_items` and the `abandoned_carts` row for that session so paying customers never appear in the abandoned list.

---

## Deployment

The app is deployed to **https://testbankbooks.com**.

Build and start commands:

```bash
npm run build   # Bundles everything into dist/
npm run start   # NODE_ENV=production node dist/index.cjs
```

The Express server in production:
- Serves the built React app as static files
- Handles `/api/*` routes
- Serves `/uploads/*` for images and downloads
- Handles Stripe webhooks at `/api/stripe/webhook`

**Do not modify:**
- `package.json` scripts
- `vite.config.ts`
- `drizzle.config.ts`

---

## Common Development Tasks

### Add a new API route
1. Add the handler in `server/routes.ts` inside `registerRoutes(app)`
2. Add any new DB operation to `IStorage` in `server/storage.ts` and implement it in `DatabaseStorage`
3. If you changed the schema, run `npm run db:push`

### Add a new page
1. Create `client/src/pages/MyPage.tsx`
2. Register the route in `client/src/App.tsx`
3. Add the `<SEO>` component for meta tags

### Add a new database table
1. Define the table in `shared/schema.ts` using Drizzle syntax
2. Export insert schema (`createInsertSchema`) and types
3. Run `npm run db:push`
4. Add CRUD methods to `IStorage` + `DatabaseStorage` in `server/storage.ts`

### Change admin password
Run this SQL against the database (replace the hash with a fresh `bcrypt.hash('newpassword', 12)` output):

```sql
UPDATE admin_users SET password = '<bcrypt_hash>' WHERE username = 'soufiane66';
```
