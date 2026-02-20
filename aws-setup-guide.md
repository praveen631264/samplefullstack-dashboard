# AWS Setup Guide - SampleFullstack Dashboard

Complete guide to deploy the SampleFullstack Dashboard to AWS with EC2 + Apache + RDS PostgreSQL.

---

## Architecture

```
Internet
   |
   v
[Elastic IP: YOUR_EC2_PUBLIC_IP]
   |
   v
[EC2 Instance - Ubuntu 22.04]
   |
   +-- Apache (port 80)
   |     |
   |     +-- Serves frontend static files (HTML/CSS/JS)
   |     +-- Reverse proxy /api/* --> Node.js (port 5000)
   |
   +-- Node.js + PM2 (port 5000)
   |     |
   |     +-- Express API server (dist/index.cjs)
   |
   +-- Connects to RDS PostgreSQL (port 5432, private network)
```

---

## Prerequisites

- AWS account with EC2 and RDS access
- SSH key pair (.pem file) for EC2 access
- Git installed on your local machine
- Node.js 20+ installed locally (for building)

---

## Part 1: Create EC2 Instance

1. Go to AWS Console > EC2 > Launch Instance
2. Settings:
   - Name: `samplefullstack-server`
   - OS: Ubuntu 22.04 LTS
   - Instance type: `t2.micro` (free tier)
   - Key pair: Create or select existing (download .pem file)
   - Network Settings > Edit:
     - VPC: your VPC
     - Subnet: select a PUBLIC subnet
     - Auto-assign public IP: Enable
     - Allow SSH (port 22): from 0.0.0.0/0
     - Allow HTTP (port 80): from 0.0.0.0/0
     - Allow HTTPS (port 443): from 0.0.0.0/0
   - Storage: 20 GB gp2
3. Launch Instance
4. Assign Elastic IP:
   - EC2 > Elastic IPs > Allocate Elastic IP address > Allocate
   - Select it > Actions > Associate > choose your instance

---

## Part 2: Create RDS PostgreSQL Database

1. Go to AWS Console > RDS > Create database
2. Settings:
   - Engine: PostgreSQL (NOT Aurora)
   - Template: Free tier
   - DB instance identifier: `your-db-identifier`
   - Master username: `your_db_user`
   - Credentials: Self managed
   - Master password: choose a strong password
   - Instance class: db.t3.micro
   - Storage: 20 GB gp2, uncheck autoscaling
   - Connectivity:
     - Select "Connect to an EC2 compute resource"
     - Pick your EC2 instance
     - Public access: No
   - Monitoring:
     - Database Insights: Standard
     - Uncheck Enhanced Monitoring
     - Uncheck DevOps Guru
   - Additional configuration:
     - Initial database name: leave as `postgres` (default)
     - Uncheck automated backups (for dev)
     - Uncheck deletion protection (for dev)
3. Click Create database
4. Wait 5-10 minutes until status shows "Available"
5. Note the **Endpoint** (e.g., `your-db-identifier.xxxxx.us-west-2.rds.amazonaws.com`)

> **Important:** The application uses the default `postgres` database. You do NOT need to create a separate database.

---

## Part 3: SSH into EC2 and Install Software

```bash
# Connect to EC2 (replace with your key file and IP)
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Run all these commands on EC2:

```bash
# Update system (press Tab + Enter on any purple screens)
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Apache
sudo apt install -y apache2

# Install PM2 (process manager for Node.js)
sudo npm install -g pm2

# Enable required Apache modules
sudo a2enmod proxy proxy_http rewrite
sudo systemctl restart apache2
```

---

## Part 4: Configure Apache Reverse Proxy

```bash
sudo vi /etc/apache2/sites-available/samplefullstack.conf
```

Press `i` to enter insert mode. Paste the following (replace `YOUR_PUBLIC_IP` with your Elastic IP):

```apache
<VirtualHost *:80>
    ServerName YOUR_PUBLIC_IP
    DocumentRoot /home/ubuntu/app/dist/public

    <Directory /home/ubuntu/app/dist/public>
        Options FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # Ensure JavaScript and CSS files are served with correct MIME types
    AddType application/javascript .js
    AddType text/css .css

    # Backend API reverse proxy
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    # SPA fallback - only for non-file, non-directory, non-API routes
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/api
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-f
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

Press `Esc`, type `:wq`, press `Enter`.

Then run:

```bash
sudo a2dissite 000-default.conf
sudo a2ensite samplefullstack.conf
sudo systemctl restart apache2
```

> **Critical Apache Config Notes:**
> 1. `AddType` directives are **required** — without them, Apache may serve `.js` files as `text/html`, causing a blank white screen
> 2. Use `%{DOCUMENT_ROOT}%{REQUEST_URI}` in rewrite conditions (NOT `%{REQUEST_FILENAME}`) — this ensures Apache correctly detects existing static files
> 3. Use `Options FollowSymLinks` and `AllowOverride None` — `AllowOverride All` is unnecessary and can cause issues

---

## Part 5: Fix Home Directory Permissions

Apache needs permission to traverse the `/home/ubuntu` directory to reach the app files. Without this, you'll get a **403 Forbidden** error.

```bash
chmod 755 /home/ubuntu
```

> **Why this is needed:** By default, Ubuntu sets `/home/ubuntu` to `750`, which blocks Apache (running as `www-data` user) from accessing files inside it.

---

## Part 6: Create App Directory

```bash
mkdir -p /home/ubuntu/app
```

---

## Part 7: Build and Deploy

### Option A: Automated deploy script (recommended)

Edit `deploy.sh` in the project root and update these variables:
- `EC2_IP` - your Elastic IP
- `SSH_KEY` - path to your .pem file
- `DB_URL` - your RDS connection string

```bash
# Example DB_URL format:
# postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres
```

Then run:

```bash
chmod +x deploy.sh
./deploy.sh
```

### Option B: Manual deploy

**From your local machine:**

```bash
# Build
npm run build

# Upload to EC2 (replace with your key and IP)
scp -i your-key.pem -r dist/ ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/app/
scp -i your-key.pem package.json ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/app/
scp -i your-key.pem package-lock.json ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/app/
```

**Then on EC2:**

```bash
cd /home/ubuntu/app
npm install --production

# Start the app with environment variables (replace with your values)
NODE_ENV=production DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres" pm2 start dist/index.cjs --name samplefullstack-api
pm2 save
pm2 startup

# Fix permissions for Apache to serve frontend files
chmod 755 /home/ubuntu
chmod -R 755 /home/ubuntu/app/dist/public
```

> **Important Notes:**
> - The build outputs `dist/index.cjs` (CommonJS format), NOT `dist/index.js`. Using the wrong filename will cause PM2 to fail.
> - The `NODE_ENV=production` flag is **required** — it enables SSL database connections for RDS.
> - Environment variables must be set inline with the `pm2 start` command so PM2 captures them.

---

## Part 8: Set Up Database Tables and Seed Data

After the app is deployed and running, you need to create database tables and insert sample data.

### Using the DB scripts (recommended)

Edit `db-scripts/run-db-scripts.sh` and update these variables:
- `EC2_IP` - your Elastic IP
- `SSH_KEY` - path to your .pem file
- `DB_URL` - your RDS connection string

Then run:

```bash
# Create tables
./db-scripts/run-db-scripts.sh ddl

# Insert sample data
./db-scripts/run-db-scripts.sh dml

# Verify data
./db-scripts/run-db-scripts.sh queries

# Or do all 3 at once
./db-scripts/run-db-scripts.sh all
```

### Available DB script commands

| Command | Description |
|---------|-------------|
| `ddl` | Creates all 4 tables (users, products, orders, activities) |
| `dml` | Inserts sample data (5 users, 15 products, 20 orders, 20 activities) |
| `queries` | Runs 10 read-only queries to inspect database state |
| `all` | Full reset: DDL + DML + Queries (asks for confirmation) |
| `status` | Check database connection and table counts |
| `custom <file.sql>` | Run any custom SQL file |

---

## Part 9: Set DATABASE_URL Permanently on EC2 (Optional)

If you want the database URL to persist across reboots without PM2:

```bash
sudo vi /etc/environment
```

Press `i`, add this line (replace with your values):

```
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres"
NODE_ENV="production"
```

Press `Esc`, type `:wq`, press `Enter`.

Then run:

```bash
source /etc/environment
```

---

## Part 10: Set PM2 to Start on Boot

```bash
pm2 startup systemd
# Copy and run the command PM2 gives you (starts with sudo env...)
pm2 save
```

---

## Verify Everything Works

Replace `YOUR_EC2_PUBLIC_IP` with your Elastic IP:

- Frontend: `http://YOUR_EC2_PUBLIC_IP`
- API Health: `http://YOUR_EC2_PUBLIC_IP/api/health`
- Products API: `http://YOUR_EC2_PUBLIC_IP/api/products`
- Orders API: `http://YOUR_EC2_PUBLIC_IP/api/orders`
- Activities API: `http://YOUR_EC2_PUBLIC_IP/api/activities`
- Dashboard Metrics: `http://YOUR_EC2_PUBLIC_IP/api/dashboard/metrics`

---

## Future Deployments

After making code changes, just run:

```bash
./deploy.sh
```

This will rebuild, upload, and restart the app automatically.

After deploying, verify permissions are correct:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP "chmod 755 /home/ubuntu && chmod -R 755 /home/ubuntu/app/dist/public"
```

---

## Summary of Issues Found & Fixed During Deployment

| # | Issue | Symptom | Root Cause | Fix |
|---|-------|---------|------------|-----|
| 1 | Wrong server filename | PM2 fails to start | Build outputs `dist/index.cjs`, not `dist/index.js` | Use `pm2 start dist/index.cjs` |
| 2 | 403 Forbidden on frontend | Apache returns "Forbidden" error page | `/home/ubuntu` directory has `750` permissions by default | Run `chmod 755 /home/ubuntu` |
| 3 | White screen (blank page) | Page loads but nothing renders | Apache served `.js` files with `text/html` MIME type; rewrite rules caught static file requests | Added `AddType` directives; use `%{DOCUMENT_ROOT}%{REQUEST_URI}` in rewrite conditions |
| 4 | API returns 500 errors | Dashboard shows no data | Database `samplefullstack` didn't exist on RDS; app was pointing to wrong DB | Use default `postgres` database instead |
| 5 | Database connection fails | "no pg_hba.conf entry" error | RDS requires SSL connections; app didn't enable SSL | Added SSL config in `server/db.ts` for production (`NODE_ENV=production`) |
| 6 | Tables don't exist | All API calls return 500 | `drizzle-kit push` can't run in production (devDependencies not installed) | Created DDL/DML SQL scripts to create tables and seed data directly |

---

## Troubleshooting

### Cannot SSH into EC2
- Check security group allows port 22
- Check instance is in a PUBLIC subnet
- Check Elastic IP is associated

### 403 Forbidden on frontend
- Check home directory permissions: `ls -la /home/ubuntu` (should show `rwxr-xr-x`)
- Fix with: `chmod 755 /home/ubuntu`
- Check public directory permissions: `chmod -R 755 /home/ubuntu/app/dist/public`

### White screen / JavaScript not loading
- Open browser developer console (F12 > Console tab) and look for errors
- If you see "MIME type text/html" errors, the Apache config is missing MIME type directives
- Check JS file is served correctly: `curl -I http://localhost:80/assets/index-XXXXX.js` — Content-Type should be `application/javascript`
- Verify the Apache config uses `%{DOCUMENT_ROOT}%{REQUEST_URI}` in rewrite conditions

### Frontend loads but API calls fail (500 errors)
- Check PM2 is running: `pm2 list`
- Check PM2 logs for errors: `pm2 logs samplefullstack-api`
- Check DATABASE_URL is correct: `pm2 env 0 | grep DATABASE`
- Check NODE_ENV is set: `pm2 env 0 | grep NODE_ENV`
- Verify tables exist: `./db-scripts/run-db-scripts.sh status`
- If tables are missing, run: `./db-scripts/run-db-scripts.sh ddl` then `./db-scripts/run-db-scripts.sh dml`

### Database connection fails
- Check RDS is in "Available" state in AWS Console
- Check EC2 security group allows outbound port 5432 to RDS security group
- Ensure `NODE_ENV=production` is set (enables SSL for RDS)
- Test connection: `./db-scripts/run-db-scripts.sh status`

### App crashes on startup
- Check PM2 logs: `pm2 logs samplefullstack-api`
- Make sure you're using `dist/index.cjs` (not `dist/index.js`)
- Verify environment variables: `pm2 env 0`

---

## Project File Structure

```
project-root/
├── client/src/           # React frontend source
├── server/               # Express backend source
├── shared/               # Shared types and schemas
├── db-scripts/           # Database management scripts
│   ├── ddl.sql           # Table creation script
│   ├── dml.sql           # Sample data insertion script
│   ├── queries.sql       # Read-only inspection queries
│   ├── run-db-scripts.sh # Script runner (connects via EC2)
│   └── run-sql.cjs       # Node.js SQL executor
├── deploy.sh             # Automated deployment script
├── aws-setup-guide.md    # This guide
└── .gitignore            # Excludes .pem, .env, dist, node_modules
```
