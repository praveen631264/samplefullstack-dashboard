#!/bin/bash

# =============================================================
# SampleFullstack - One-Click Deploy to AWS EC2
# =============================================================
# Usage: ./deploy.sh
#
# Before first run, update the variables below with your values.
# =============================================================

# ---- CONFIGURATION (Update these with your values) ----
EC2_IP="54.69.3.81"
EC2_USER="ubuntu"
SSH_KEY="C:\Users\prave\OneDrive\Desktop\Finos\Aihackathon.pem"
REMOTE_DIR="/home/ubuntu/app"
DB_URL="postgresql://aihackathon:aihackathon@aihackathondb.c96o0o2w623s.us-west-2.rds.amazonaws.com:5432/postgres"
# ---- END CONFIGURATION ----

set -e

echo "========================================="
echo "  SampleFullstack - Deploy to AWS"
echo "========================================="

# Step 1: Build the app
echo ""
echo "[1/5] Building the Spring Boot application..."
cd backend-spring
mvn clean package -DskipTests
cd ..
echo "      Build complete."

# Step 2: Create remote directory
echo ""
echo "[2/5] Preparing remote server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

# Step 3: Copy files to EC2
echo ""
echo "[3/5] Uploading files to EC2..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no backend-spring/target/*.jar "$EC2_USER@$EC2_IP:$REMOTE_DIR/app.jar"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r frontend/ "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
echo "      Upload complete."

# Step 4: Verification on EC2
echo ""
echo "[4/5] Verifying environment on EC2..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << ENDSSH
cd $REMOTE_DIR
java -version
ENDSSH
echo "      Verification complete."

# Start the application on EC2
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << ENDSSH
cd $REMOTE_DIR

# Map standard DB_URL to Spring Boot properties
# Extract hostname from DB_URL for JDBC URL
DB_HOST=$(echo $DB_URL | sed -e 's|.*@||' -e 's|:.*||')
export SPRING_DATASOURCE_URL="jdbc:postgresql://$DB_HOST:5432/postgres"
export SPRING_DATASOURCE_USERNAME="aihackathon"
export SPRING_DATASOURCE_PASSWORD="aihackathon"
export SPRING_DATASOURCE_DRIVER="org.postgresql.Driver"
export SPRING_JPA_DIALECT="org.hibernate.dialect.PostgreSQLDialect"
export NODE_ENV="production"

# Stop Apache to free up port 80 if it's running
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl disable apache2 2>/dev/null || true

# Stop existing app if running
sudo pm2 delete test-orchestrator 2>/dev/null || true

# Start the Spring Boot app with sudo for port 80
sudo pm2 start "/usr/bin/java -jar app.jar" --name test-orchestrator

sudo pm2 save

# Fix permissions for server
chmod 755 /home/ubuntu
chmod -R 755 /home/ubuntu/app/frontend

echo ""
echo "PM2 process status:"
pm2 list
ENDSSH

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "  Frontend:    http://$EC2_IP"
echo "  API Health:  http://$EC2_IP/api/health"
echo "  All APIs:    http://$EC2_IP/api/*"
echo ""
echo "========================================="
