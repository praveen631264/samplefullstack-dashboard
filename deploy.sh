#!/bin/bash

# =============================================================
# SampleFullstack - One-Click Deploy to AWS EC2
# =============================================================
# Usage: ./deploy.sh
#
# Before first run, update the variables below with your values.
# =============================================================

# ---- CONFIGURATION (UPDATE THESE) ----
EC2_IP="54.69.3.81"
EC2_USER="ubuntu"
SSH_KEY="$HOME/Aihackathon.pem"
REMOTE_DIR="/home/ubuntu/app"
DB_URL="postgresql://sampleapp:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/samplefullstack"
# ---- END CONFIGURATION ----

set -e

echo "========================================="
echo "  SampleFullstack - Deploy to AWS"
echo "========================================="

# Step 1: Build the app
echo ""
echo "[1/5] Building the application..."
npm run build
echo "      Build complete."

# Step 2: Create remote directory
echo ""
echo "[2/5] Preparing remote server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

# Step 3: Copy files to EC2
echo ""
echo "[3/5] Uploading files to EC2..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/ "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no package.json "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no package-lock.json "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no drizzle.config.ts "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
echo "      Upload complete."

# Step 4: Install dependencies and push DB schema
echo ""
echo "[4/5] Installing dependencies and setting up database..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << ENDSSH
cd $REMOTE_DIR
npm install --production
export DATABASE_URL="$DB_URL"
npx drizzle-kit push --force
ENDSSH
echo "      Dependencies installed, database schema pushed."

# Step 5: Start/restart the app with PM2
echo ""
echo "[5/5] Starting the application..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << ENDSSH
cd $REMOTE_DIR
export DATABASE_URL="$DB_URL"
export NODE_ENV="production"
export PORT="5000"

# Stop existing app if running
pm2 delete samplefullstack-api 2>/dev/null || true

# Start the app
pm2 start dist/index.js --name samplefullstack-api --env production -- --port 5000
pm2 save

echo ""
echo "PM2 process status:"
pm2 list
ENDSSH

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "  Frontend:   http://$EC2_IP"
echo "  API Health:  http://$EC2_IP/api/health"
echo "  All APIs:    http://$EC2_IP/api/*"
echo ""
echo "========================================="
