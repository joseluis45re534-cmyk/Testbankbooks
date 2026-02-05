# Testbankbooks

## Overview

Testbankbooks is a high-performance e-commerce platform for selling nursing test banks and study guides. The application features a modern React frontend with a clean, professional design, an Express.js backend API, and PostgreSQL database storage. Products are imported from an external XML feed and customers can browse, search, filter by category, add items to cart, and proceed through checkout.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### SEO Implementation (Latest)
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
- `client/src/pages/Home.tsx` - Product listing with search/filter
- `client/src/pages/ProductDetail.tsx` - Product detail with add to cart
- `client/src/pages/Cart.tsx` - Shopping cart management
- `client/src/pages/Checkout.tsx` - Two-step checkout flow