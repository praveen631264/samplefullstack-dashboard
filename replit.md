# SampleFullstack Dashboard App

## Overview
A full-stack dashboard application built with React frontend and Express/Node.js backend, connected to a PostgreSQL database. The dashboard displays real-time metrics, revenue charts, order analytics, product management, and activity logs.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js (Node.js) REST API
- **Database**: PostgreSQL (via Drizzle ORM)
- **Routing**: wouter (frontend), Express router (backend)
- **Charts**: Recharts
- **State Management**: TanStack React Query

## Project Structure
```
client/src/
  App.tsx              - Main app with sidebar layout
  components/
    app-sidebar.tsx    - Navigation sidebar
    theme-provider.tsx - Light/dark theme context
    theme-toggle.tsx   - Theme toggle button
    stats-card.tsx     - Metric stat card component
    revenue-chart.tsx  - Revenue area chart
    orders-chart.tsx   - Orders bar chart by status
    recent-activity.tsx - Recent activity feed
    top-products.tsx   - Top products table
  pages/
    dashboard.tsx      - Main dashboard view
    products.tsx       - Products list page
    orders.tsx         - Orders list page
    activity.tsx       - Activity log page

server/
  index.ts             - Express server entry
  db.ts                - Database connection (pg + Drizzle)
  routes.ts            - API route handlers
  storage.ts           - Database storage layer (IStorage interface)
  seed.ts              - Database seed data

shared/
  schema.ts            - Drizzle schema + TypeScript types
```

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/dashboard/metrics` - Dashboard summary metrics
- `GET /api/dashboard/revenue` - Revenue by month
- `GET /api/dashboard/orders-by-status` - Order count by status
- `GET /api/dashboard/top-products` - Top selling products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create order
- `GET /api/activities` - Recent activity log

## Database Tables
- `users` - User accounts
- `products` - Product catalog (name, category, price, stock, status)
- `orders` - Customer orders (customer, product, quantity, amount, status)
- `activities` - System activity log

## Running
```bash
npm run dev          # Start dev server (port 5000)
npm run db:push      # Push schema to database
```

## AWS Deployment Guide

### Prerequisites
1. AWS account with EC2 access
2. An EC2 instance (Amazon Linux 2 or Ubuntu)
3. Security group allowing ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
4. A PostgreSQL database (RDS or self-hosted on EC2)

### Step 1: Prepare EC2 Instance
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install Apache
sudo yum install -y httpd
sudo systemctl enable httpd
sudo systemctl start httpd

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 2: Deploy Backend
```bash
# Copy your built files to EC2
# From local: scp -r dist/ ec2-user@your-ip:/home/ec2-user/app/

# On EC2:
cd /home/ec2-user/app
npm install --production
export DATABASE_URL="postgresql://user:pass@your-db-host:5432/samplefullstack"
pm2 start dist/index.js --name samplefullstack-api
pm2 save
pm2 startup
```

### Step 3: Configure Apache Reverse Proxy
```bash
sudo vi /etc/httpd/conf.d/samplefullstack.conf
```

Add this config:
```apache
<VirtualHost *:80>
    ServerName your-public-ip-or-domain

    # Frontend - serve static files
    DocumentRoot /home/ec2-user/app/dist/public

    <Directory /home/ec2-user/app/dist/public>
        AllowOverride All
        Require all granted
    </Directory>

    # Backend API reverse proxy
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    # SPA fallback - serve index.html for all non-API routes
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/api
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

```bash
# Enable required Apache modules
sudo a2enmod proxy proxy_http rewrite  # Ubuntu
# or for Amazon Linux:
# Modules are usually pre-installed, check /etc/httpd/conf.modules.d/

sudo systemctl restart httpd
```

### Step 4: Set Up PostgreSQL (RDS)
1. Create RDS PostgreSQL instance in AWS Console
2. Configure security group to allow EC2 to connect
3. Set DATABASE_URL environment variable on EC2
4. Run schema push: `npm run db:push`

### Step 5: Access the App
- Frontend: `http://your-ec2-public-ip`
- Backend API: `http://your-ec2-public-ip/api/health`
- All API endpoints accessible via `/api/*` through reverse proxy

## User Preferences
- Dark/light theme toggle available
- Sidebar navigation with collapsible menu
