# Puri Indah Sales

A sales management web application for Puri Indah, built to handle daily sales operations across multiple stores.

## Features

- **Sales** — Create and manage sales transactions with cart-based ordering
- **Sales History** — View and track past transactions
- **Products** — Manage product catalog and pricing
- **Customers** — Customer data management
- **Deliveries (Pengiriman)** — Manage delivery orders and driver assignments
- **Master Data** — Configure drivers and other reference data
- **Users** — User and role management per store
- **Multi-store support** — Switch between stores with role-based access control
- **Authentication** — Supabase-powered auth with protected routes

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix UI + Tailwind CSS)
- **State / Data fetching**: TanStack Query v5
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Package manager**: Bun

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- A Supabase project (the project ID is pre-configured in `supabase/config.toml`)

## Getting Started

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd puri-indah-sales

# 2. Install dependencies
bun install

# 3. Set up environment variables
#    Create a .env file in the project root:
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# 4. Start the development server
bun run dev
```

The app will be available at `http://localhost:8080`.

## Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |

## Database Migrations

Migrations are located in `supabase/migrations/`. To apply them to a local Supabase instance:

```sh
supabase db reset
```

Or push to a remote project:

```sh
supabase db push
```
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
