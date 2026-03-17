# Testbankbooks

## Overview

Testbankbooks is a high-performance e-commerce platform for selling nursing test banks and study guides. The application features a modern React frontend with a clean, professional design, an Express.js backend API, and PostgreSQL database storage. Products are imported from an external XML feed and customers can browse, search, filter by category, add items to cart, and proceed through checkout.

## User Preferences

Preferred communication style: Simple, everyday language.

## Business Address
- **Location**: 5 Alvingham Ave, Castle Douglas DG7 1JF, United Kingdom
- **Displayed on**: Contact page, About page, structured data

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing with pages for Home, Product Detail, Cart, and Checkout
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js 5 with TypeScript running on Node.js
- **API Design**: RESTful endpoints under `/api/` prefix for products, categories, and cart operations
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Development**: Vite middleware integration for hot module replacement during development
- **Production**: Static file serving from built assets in `dist/public`

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Migrations**: Drizzle Kit for database migrations stored in `migrations/` directory
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod

### Database Schema
- **products**: Stores product catalog with id, title, description, price, salePrice, imageUrl, category, and SEO-friendly slug
- **cart_items**: Session-based cart with product references and quantities
- **users**: Basic user authentication table
- **session**: PostgreSQL session storage table (auto-created)
- **chat_conversations**: Customer chat sessions with visitor tracking
- **chat_messages**: Individual messages with sender type and read status

### Data Import
- XML parser in `server/xmlParser.ts` fetches and imports products from external Google Shopping XML feed
- Automatic category extraction based on product title keywords
- HTML entity cleaning and slug generation for SEO-friendly URLs

### Build System
- **Client Build**: Vite compiles React app to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs` with selective dependency bundling
- **Scripts**: `npm run dev` for development, `npm run build` for production, `npm run db:push` for schema sync

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database abstraction and query builder
- **connect-pg-simple**: Session storage in PostgreSQL

### Frontend Libraries
- **Radix UI**: Headless component primitives for accessibility
- **TanStack React Query**: Data fetching and caching
- **Lucide React**: Icon library
- **react-icons**: Additional icons (payment brands)
- **embla-carousel-react**: Carousel component
- **react-day-picker**: Date picker component
- **vaul**: Drawer component
- **cmdk**: Command palette component

### Build Tools
- **Vite**: Frontend build and development server
- **esbuild**: Server-side bundling
- **TypeScript**: Type checking across the entire codebase
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS/Autoprefixer**: CSS processing

### Replit-specific Plugins
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development banner

## Recent Changes

### Blog System with 300 Auto-Generated Study Guides (Mar 2026)
- **Blog index page**: `/blog` with category sidebar, search, responsive card grid
- **Blog post detail page**: `/blog/:slug` with product sidebar (add to cart CTA), related product info
- **Blog generator**: `server/blogGenerator.ts` — template engine producing HTML content per product with study tips, topic lists, FAQ
- **Blog database table**: `blog_posts` in `shared/schema.ts`
- **Blog API routes**: Public (`/api/blog`, `/api/blog/categories`, `/api/blog/:slug`), Admin (`/api/admin/blog`, generate per-product, generate-all)
- **Product by ID route**: `/api/products/id/:id` for blog post sidebar to fetch linked product
- **300 blog posts seeded**: One per product, all published, linked by productId
- **Sitemap updated**: Now includes 300 blog post URLs (609 URLs total)
- **Navigation**: "Study Guides" link added to desktop header, mobile menu, and footer
- **Blog content CSS**: `.blog-content` styles in `index.css` for h2/h3/p/ul/ol/li/strong
- **Key files**: `server/blogGenerator.ts`, `client/src/pages/Blog.tsx`, `client/src/pages/BlogPost.tsx`

### SEO Keyword-Based Blog Automation (Feb 2026)
- **Manual only**: Auto-scheduler removed; you control when blogs are generated via "Auto-Generate all" button
- **SEO Keywords table**: `seoKeywords` in `shared/schema.ts` stores keyword/category/status/slug
- **Blog Schedule config**: `blogScheduleConfig` table stores enable flag, posts-per-day, last/next run times
- **Admin UI**: `client/src/pages/admin/AdminSEO.tsx` with bulk keyword import, search, filters, category selector, manual "Auto-Generate all" button, "Run Now" trigger
- **API endpoints**: 
  - GET/POST/PATCH/DELETE `/api/admin/seo/keywords` (manage keywords)
  - GET/PATCH `/api/admin/seo/schedule` (view/update schedule config)
  - POST `/api/admin/seo/schedule/run-now` (manual trigger)
- **Keyword statuses**: `pending` (queued), `used` (post generated), `paused` (skipped)
- **Files**: `server/scheduler.ts` (manual-only logic), `server/blogGenerator.ts` (keyword→post generation), `client/src/pages/admin/AdminSEO.tsx` (control UI)

### Google Merchant Center Misrepresentation Fixes (Mar 2026)
- **Google Shopping Feed**: Already removed — no `/feed/google-shopping.xml` route served
- **Structured data cleanup**: Removed `itemCondition` from Product JSON-LD schema (condition is a physical product concept, not applicable to digital goods)
- **Open Graph cleanup**: Removed `product:condition` meta tag from all product pages
- **Organization schema**: Removed `contactOption: "TollFree"` (number is not toll-free — was inaccurate)
- **Files changed**: `client/src/components/SEO.tsx`, `client/src/pages/ProductDetail.tsx`
- **No fake social proof**: Audited all pages — no fake reviews, ratings, scarcity claims, or misleading copy

### Automated Order Confirmation Emails (Latest - Feb 2026)
- **Email service**: Resend (`resend` npm package) for transactional email delivery
- **Trigger**: Automatically sends after successful PayPal capture or Stripe payment confirmation
- **Content**: Professional HTML email with order details, product list, and download link to `/thank-you/{orderId}`
- **Non-blocking**: Email sending is fire-and-forget (doesn't delay the checkout response)
- **Key files**: `server/email.ts`
- **Secrets**: `RESEND_API_KEY` stored as Replit secret
- **From address**: Uses `support@testbankbooks.com` (verified domain)

### Stripe + PayPal Dual Payment Integration (Feb 2026)
- **Stripe checkout**: `@stripe/stripe-js` for client-side Elements, `stripe` npm for server-side
- **Server routes**: `/api/stripe/config` (publishable key), `/api/stripe/create-payment-intent` (server-side amount), `/api/stripe/confirm-payment` (verify + create order)
- **Payment method selector**: Checkout step 2 lets customer choose Card (Stripe) or PayPal
- **Stripe Elements**: Payment Element with automatic payment method detection
- **Buy Now button**: Product detail page has "Buy Now" (add to cart + redirect to checkout) and "Add to Cart"
- **Key files**: `server/stripe.ts`, `client/src/components/StripeCheckout.tsx`
- **Secrets**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` stored as Replit secrets (not via integration connector)

### PayPal Sandbox Integration (Feb 2026)
- **PayPal checkout**: Replaced card form with PayPal Web SDK v6 checkout button
- **Server SDK**: `@paypal/paypal-server-sdk` for order creation and capture
- **Routes**: `/paypal/setup` (client token), `/paypal/order` (create), `/paypal/order/:orderID/capture` (capture)
- **Two-step flow**: Contact info (step 1) then PayPal payment (step 2)
- **Order integration**: PayPal capture success triggers internal order creation and cart clearing
- **Environment**: Sandbox mode in development, production mode when NODE_ENV=production
- **Key files**: `server/paypal.ts`, `client/src/components/PayPalButton.tsx`

### Google Merchant Center Compliance (Feb 2026)
- **Legal pages**: Privacy Policy, Terms & Conditions, Refund Policy, Shipping Policy, Contact Us - all linked in footer
- **Google Shopping XML feed**: Available at `/feed/google-shopping.xml` — recategorized from "Books" to "Software > Educational Software" to avoid digital books policy violation
- **Enhanced structured data**: Product JSON-LD with brand, SKU, condition, priceValidUntil, canonical URLs; Organization and WebSite schemas on homepage
- **robots.txt**: Proper directives at `/robots.txt` blocking admin/API routes
- **Sitemap updated**: Includes all legal pages with changefreq attributes
- **Contact form**: POST `/api/contact` endpoint with Zod validation
- **Product data cleanup**: Fixed 4 products with insufficient descriptions
- **Misrepresentation fixes**: Removed fake reviews (4.9★/128 reviews), fake scarcity, fake social proof; replaced placeholder phone numbers with real contact info

### Live Chat System (Feb 2026)
- **Customer chat widget**: Floating chat button on all non-admin pages with real-time messaging
- **Required name/email capture**: Visitors must enter name and email before sending first message; info saved to localStorage for returning visitors
- **Admin conversation labels**: Conversations displayed as `Name (email)` in admin chat panel sidebar
- **Admin chat interface**: Dedicated `/admin/chat` page to manage customer conversations with name/email in header
- **Database tables**: chat_conversations (visitorName, visitorEmail fields) and chat_messages for persistent storage
- **Real-time updates**: Polling-based message synchronization every 3 seconds
- **Unread indicators**: Badge notifications for new messages on both customer and admin sides
- **Message read tracking**: Separate read status for visitor and admin messages

### SEO Implementation
- **react-helmet-async**: Per-page meta tags with unique titles and descriptions
- **Open Graph tags**: Facebook/Twitter sharing optimization
- **JSON-LD schema**: Product structured data for rich search results
- **sitemap.xml**: Dynamic sitemap generation at `/sitemap.xml`
- **Global search**: Header search works on all pages, routes to home with query

### API Validation
- Zod schema validation on cart endpoints (POST/PATCH)
- Proper error responses with detailed validation messages

## Key Files
- `shared/schema.ts` - Database schema definitions
- `server/routes.ts` - API endpoints with validation
- `server/xmlParser.ts` - XML feed parser for product import
- `server/storage.ts` - Database storage interface
- `client/src/components/SEO.tsx` - SEO meta tag component
- `client/src/components/Header.tsx` - Global header with search
- `client/src/components/ChatWidget.tsx` - Customer live chat widget
- `client/src/pages/Home.tsx` - Product listing with search/filter
- `client/src/pages/ProductDetail.tsx` - Product detail with add to cart
- `client/src/pages/Cart.tsx` - Shopping cart management
- `server/paypal.ts` - PayPal SDK integration (order creation, capture, client token)
- `client/src/components/PayPalButton.tsx` - PayPal checkout button component
- `client/src/pages/Checkout.tsx` - Two-step checkout flow with PayPal payment
- `client/src/pages/admin/AdminChat.tsx` - Admin chat management interface
- `server/email.ts` - Automated order confirmation emails via Resend