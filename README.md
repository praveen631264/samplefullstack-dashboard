# SampleFullstack Dashboard

A full-stack dashboard application built with React frontend and Express/Node.js backend, connected to PostgreSQL database. Displays real-time metrics, revenue charts, order analytics, product management, and activity logs.

## Live Demo

Deploy to AWS EC2 with Apache reverse proxy and RDS PostgreSQL. See [AWS Setup Guide](aws-setup-guide.md) for detailed instructions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Express.js, Node.js |
| Database | PostgreSQL (Drizzle ORM) |
| Routing | wouter (frontend), Express Router (backend) |
| State | TanStack React Query |
| Deployment | AWS EC2, Apache, PM2, RDS PostgreSQL |

## Features

- Dashboard with 4 key metric cards (revenue, orders, products, customers)
- Revenue trend area chart (monthly)
- Orders breakdown bar chart (by status)
- Top products table with revenue data
- Recent activity feed
- Products management page
- Orders list page
- Activity log page
- Dark/Light theme toggle
- Responsive sidebar navigation

## Screenshots

Access the live dashboard at `http://YOUR_EC2_PUBLIC_IP` after deployment.

## Project Structure

```
├── client/src/               # React frontend
│   ├── components/           # Reusable UI components
│   │   ├── app-sidebar.tsx   # Navigation sidebar
│   │   ├── stats-card.tsx    # Metric stat cards
│   │   ├── revenue-chart.tsx # Revenue area chart
│   │   ├── orders-chart.tsx  # Orders bar chart
│   │   ├── recent-activity.tsx # Activity feed
│   │   ├── top-products.tsx  # Top products table
│   │   ├── theme-provider.tsx # Dark/light theme
│   │   └── theme-toggle.tsx  # Theme toggle button
│   ├── pages/                # Page components
│   │   ├── dashboard.tsx     # Main dashboard
│   │   ├── products.tsx      # Products list
│   │   ├── orders.tsx        # Orders list
│   │   └── activity.tsx      # Activity log
│   └── App.tsx               # Main app with routing
├── server/                   # Express backend
│   ├── index.ts              # Server entry point
│   ├── db.ts                 # Database connection (SSL-enabled for RDS)
│   ├── routes.ts             # API route handlers
│   ├── storage.ts            # Database storage layer
│   └── seed.ts               # Database seed data
├── shared/
│   └── schema.ts             # Drizzle schema + TypeScript types
├── db-scripts/               # Database management scripts
│   ├── ddl.sql               # Table creation (CREATE TABLE)
│   ├── dml.sql               # Sample data (INSERT)
│   ├── queries.sql           # Read-only inspection queries
│   ├── run-db-scripts.sh     # Script runner via SSH to EC2
│   └── run-sql.cjs           # Node.js SQL executor
├── deploy.sh                 # One-click deploy to AWS EC2
├── aws-setup-guide.md        # Complete AWS deployment guide
└── .gitignore                # Excludes .pem, .env, dist, node_modules
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with DB status |
| GET | `/api/dashboard/metrics` | Dashboard summary (revenue, orders, products, customers) |
| GET | `/api/dashboard/revenue` | Revenue by month |
| GET | `/api/dashboard/orders-by-status` | Order count by status |
| GET | `/api/dashboard/top-products` | Top selling products |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create a product |
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Create an order |
| GET | `/api/activities` | Recent activity log |

## Database Schema

4 tables: `users`, `products`, `orders`, `activities`

See `shared/schema.ts` for full Drizzle schema definitions and `db-scripts/ddl.sql` for raw SQL.

## Getting Started (Local Development)

```bash
# Install dependencies
npm install

# Set up database (requires PostgreSQL)
export DATABASE_URL="postgresql://user:password@localhost:5432/samplefullstack"
npm run db:push

# Start development server (frontend + backend on port 5000)
npm run dev
```

## AWS Deployment

See the complete [AWS Setup Guide](aws-setup-guide.md) for step-by-step instructions.

Quick deploy after initial setup:

```bash
# Edit deploy.sh with your EC2 IP, SSH key path, and DB URL
chmod +x deploy.sh
./deploy.sh
```

## Database Scripts

Manage your RDS database directly from your local machine:

```bash
# Edit db-scripts/run-db-scripts.sh with your EC2 IP, SSH key, and DB URL first

./db-scripts/run-db-scripts.sh ddl       # Create tables
./db-scripts/run-db-scripts.sh dml       # Insert sample data
./db-scripts/run-db-scripts.sh queries   # Run inspection queries
./db-scripts/run-db-scripts.sh all       # Full reset (DDL + DML + queries)
./db-scripts/run-db-scripts.sh status    # Check DB connection
./db-scripts/run-db-scripts.sh custom file.sql  # Run custom SQL
```

## Configuration

Before deploying, update these files with your AWS details:

| File | Variables to Update |
|------|-------------------|
| `deploy.sh` | `EC2_IP`, `SSH_KEY`, `DB_URL` |
| `db-scripts/run-db-scripts.sh` | `EC2_IP`, `SSH_KEY`, `DB_URL` |

**Never commit** `.pem` files, passwords, or real database credentials to the repository.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | Set to `production` on EC2 (enables SSL for RDS) | For deployment |
| `SESSION_SECRET` | Session encryption key | Optional |
