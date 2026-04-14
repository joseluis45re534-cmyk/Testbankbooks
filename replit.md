# Testbankbooks

## Overview

Testbankbooks is a high-performance e-commerce platform specializing in nursing test banks and study guides. It features a modern React frontend, an Express.js backend API, and a PostgreSQL database. The platform allows customers to browse, search, and filter products imported from an external XML feed, add items to their cart, and proceed through a secure checkout process. The project aims to provide a robust and user-friendly experience for purchasing educational materials, incorporating strong SEO practices and efficient order processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, using Vite.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state management and caching.
- **UI Components**: Shadcn/ui built on Radix UI, styled with Tailwind CSS for theming (light/dark mode).
- **Path Aliases**: `@/` for `client/src/`, `@shared/` for `shared/`.

### Backend
- **Framework**: Express.js 5 with TypeScript on Node.js.
- **API Design**: RESTful endpoints under `/api/` for products, categories, cart, and admin functions.
- **Session Management**: Express sessions with PostgreSQL store.
- **Build**: esbuild bundles server code to `dist/index.cjs`.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL.
- **Schema**: Defined in `shared/schema.ts`, including `products`, `cart_items`, `users`, `blog_posts`, `seoKeywords`, `chat_conversations`, `chat_messages`.
- **Migrations**: Drizzle Kit for database migrations.
- **Validation**: Zod schemas generated from Drizzle.

### Data Import & Media Management
- **Product Import**: `server/xmlParser.ts` fetches and imports products from an external XML feed, automatically extracting categories and cleaning data.
- **Google Shopping Feed**: Permanently removed (returns 410 Gone at `/feed/google-shopping.xml`) due to Google Merchant Center "digital books" policy violation.
- **Self-Hosted Media**: Supports local storage of product images and downloadable files (ZIP/PDF) in `/uploads/`. Includes admin functionalities for bulk downloading external media and per-product uploads.

### Blog System
- Features a blog system with auto-generated study guides for each product.
- Admin interface to manage SEO keywords and trigger blog post generation.
- Blog posts are stored in the `blog_posts` table.

### E-commerce Features
- **Payment Gateways**: Integrated Stripe and PayPal for secure checkout.
- **Order Confirmation**: Automated email confirmations via Resend after successful payments.
- **Live Chat**: Customer-facing chat widget with real-time messaging and an admin interface for managing conversations.

### SEO & Compliance
- **Meta Tags**: Per-page meta tags with `react-helmet-async`.
- **Structured Data**: JSON-LD for rich search results (Product, Organization, WebSite schemas).
- **Sitemap & robots.txt**: Dynamic sitemap generation and proper `robots.txt` directives.
- **Canonical URLs**: Ensures correct canonical URLs for SEO.
- **Legal Pages**: Includes Privacy Policy, Terms & Conditions, Refund Policy, and Shipping Policy pages.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Database abstraction.
- **connect-pg-simple**: PostgreSQL session storage.

### Frontend Libraries
- **Radix UI**: Headless components.
- **TanStack React Query**: Data fetching and caching.
- **Lucide React**, **react-icons**: Icon libraries.
- **embla-carousel-react**: Carousel component.
- **react-day-picker**: Date picker.
- **vaul**: Drawer component.
- **cmdk**: Command palette.
- **@stripe/stripe-js**: Stripe client-side integration.

### Backend Libraries / Services
- **Resend**: Transactional email service.
- **@paypal/paypal-server-sdk**: PayPal server-side integration.
- **stripe**: Stripe server-side integration.

### Build Tools
- **Vite**: Frontend build and development.
- **esbuild**: Server-side bundling.
- **TypeScript**: Language.
- **Tailwind CSS**: Styling framework.
- **PostCSS/Autoprefixer**: CSS processing.
- **Zod**: Schema validation.