# AWS Setup Guide - SampleFullstack Dashboard

Complete guide to deploy the SampleFullstack Dashboard to AWS with EC2 + Apache + RDS PostgreSQL.

---

## Architecture

```
Internet
   |
   v
[Elastic IP: 54.69.3.81]
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
   |     +-- Express API server
   |
   +-- Connects to RDS PostgreSQL (port 5432, private network)
```

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
   - DB instance identifier: `samplefullstack-db`
   - Master username: `sampleapp`
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
     - Initial database name: `samplefullstack`
     - Uncheck automated backups (for dev)
     - Uncheck deletion protection (for dev)
3. Click Create database
4. Wait 5-10 minutes until status shows "Available"
5. Note the Endpoint (e.g., samplefullstack-db.xxxxx.us-west-2.rds.amazonaws.com)

---

## Part 3: SSH into EC2 and Install Software

```bash
# Connect to EC2
chmod 400 Aihackathon.pem
ssh -i Aihackathon.pem ubuntu@54.69.3.81
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

# Install PM2
sudo npm install -g pm2

# Enable Apache modules
sudo a2enmod proxy proxy_http rewrite
sudo systemctl restart apache2
```

---

## Part 4: Configure Apache Reverse Proxy

```bash
sudo vi /etc/apache2/sites-available/samplefullstack.conf
```

Press `i` to enter insert mode. Paste (replace YOUR_PUBLIC_IP with 54.69.3.81):

```apache
<VirtualHost *:80>
    ServerName YOUR_PUBLIC_IP

    DocumentRoot /home/ubuntu/app/dist/public

    <Directory /home/ubuntu/app/dist/public>
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/api
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
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

---

## Part 5: Create App Directory

```bash
mkdir -p /home/ubuntu/app
```

---

## Part 6: Deploy (Automated)

### Option A: Automated deploy script (recommended)

Edit `deploy.sh` in the project root and update these 3 variables:
- `EC2_IP` - your Elastic IP
- `SSH_KEY` - path to your .pem file
- `DB_URL` - your RDS connection string

Then run from your local machine:

```bash
chmod +x deploy.sh
./deploy.sh
```

This will build, upload, install dependencies, push DB schema, and start the app automatically.

### Option B: Manual deploy

From your local machine:

```bash
# Build
npm run build

# Upload to EC2
scp -i Aihackathon.pem -r dist/ ubuntu@54.69.3.81:/home/ubuntu/app/
scp -i Aihackathon.pem package.json ubuntu@54.69.3.81:/home/ubuntu/app/
scp -i Aihackathon.pem package-lock.json ubuntu@54.69.3.81:/home/ubuntu/app/
scp -i Aihackathon.pem drizzle.config.ts ubuntu@54.69.3.81:/home/ubuntu/app/
```

Then on EC2:

```bash
cd /home/ubuntu/app
npm install --production

# Set database URL (replace with your actual RDS endpoint and password)
export DATABASE_URL="postgresql://sampleapp:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/samplefullstack"

# Push database schema
npx drizzle-kit push --force

# Start the app
pm2 start dist/index.cjs --name samplefullstack-api --env production
pm2 save
pm2 startup
```

---

## Part 7: Set DATABASE_URL Permanently on EC2

So the database URL persists across reboots:

```bash
sudo vi /etc/environment
```

Press `i`, add this line (replace with your values):

```
DATABASE_URL="postgresql://sampleapp:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/samplefullstack"
```

Press `Esc`, type `:wq`, press `Enter`.

Then run:

```bash
source /etc/environment
```

---

## Part 8: Set PM2 to Start on Boot

```bash
pm2 startup systemd
# Copy and run the command PM2 gives you (starts with sudo env...)
pm2 save
```

---

## Verify Everything Works

- Frontend: http://54.69.3.81
- API Health: http://54.69.3.81/api/health
- Products API: http://54.69.3.81/api/products
- Orders API: http://54.69.3.81/api/orders
- Activities API: http://54.69.3.81/api/activities
- Dashboard Metrics: http://54.69.3.81/api/dashboard/metrics

---

## Future Deployments

After making code changes, just run:

```bash
./deploy.sh
```

This will rebuild, upload, and restart the app automatically.

---

## Troubleshooting

### Cannot SSH into EC2
- Check security group allows port 22
- Check instance is in a PUBLIC subnet
- Check Elastic IP is associated

### Frontend loads but API calls fail
- Check PM2 is running: `pm2 list`
- Check Apache config: `sudo apache2ctl configtest`
- Check Apache logs: `sudo tail -f /var/log/apache2/error.log`

### Database connection fails
- Check RDS is in "Available" state
- Check EC2 security group allows port 5432 to RDS security group
- Test connection: `psql $DATABASE_URL`

### App crashes on startup
- Check PM2 logs: `pm2 logs samplefullstack-api`
- Check DATABASE_URL is set: `echo $DATABASE_URL`
