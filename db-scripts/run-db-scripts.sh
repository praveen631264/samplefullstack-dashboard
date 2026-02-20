#!/bin/bash
# =============================================
# Database Script Runner for SampleFullstack
# Connects to EC2 and executes SQL scripts
# against the RDS PostgreSQL database
# =============================================

# --- Configuration ---
EC2_IP="YOUR_EC2_PUBLIC_IP"
SSH_KEY="path/to/your-key.pem"
DB_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Functions ---
print_header() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

show_usage() {
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  ddl       - Run DDL script (CREATE/DROP tables)"
    echo "  dml       - Run DML script (INSERT sample data)"
    echo "  queries   - Run read-only queries to inspect data"
    echo "  all       - Run DDL + DML + Queries (full reset & seed)"
    echo "  custom    - Run a custom SQL file"
    echo "  status    - Check database connection and table status"
    echo ""
    echo "Examples:"
    echo "  $0 ddl                    # Create all tables"
    echo "  $0 dml                    # Insert sample data"
    echo "  $0 queries                # Run all read queries"
    echo "  $0 all                    # Full reset: DDL + DML + Queries"
    echo "  $0 custom my-script.sql   # Run a custom SQL file"
    echo "  $0 status                 # Check DB connection"
}

check_ssh_key() {
    if [ ! -f "$SSH_KEY" ]; then
        print_error "SSH key not found: $SSH_KEY"
        echo "  Please update SSH_KEY in this script."
        exit 1
    fi
}

upload_and_run_sql() {
    local sql_file="$1"
    local description="$2"

    if [ ! -f "$sql_file" ]; then
        print_error "SQL file not found: $sql_file"
        exit 1
    fi

    print_header "Running: $description"
    echo "SQL File: $(basename $sql_file)"
    echo "Target DB: RDS PostgreSQL via EC2 ($EC2_IP)"
    echo ""

    # Upload SQL file and runner to EC2
    echo "Uploading files to EC2..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$sql_file" ubuntu@${EC2_IP}:/tmp/db_script.sql 2>/dev/null
    if [ $? -ne 0 ]; then
        print_error "Failed to upload SQL file to EC2"
        exit 1
    fi

    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SCRIPT_DIR/run-sql.cjs" ubuntu@${EC2_IP}:/home/ubuntu/app/run-sql.cjs 2>/dev/null
    if [ $? -ne 0 ]; then
        print_error "Failed to upload runner to EC2"
        exit 1
    fi
    print_success "Files uploaded"

    # Execute SQL on EC2 via Node.js (run from app dir so pg module is available)
    echo ""
    echo "Executing SQL..."
    echo -e "${YELLOW}--- OUTPUT START ---${NC}"
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@${EC2_IP} \
        "cd /home/ubuntu/app && DATABASE_URL='$DB_URL' node run-sql.cjs /tmp/db_script.sql" 2>&1
    local exit_code=$?
    echo -e "${YELLOW}--- OUTPUT END ---${NC}"
    echo ""

    # Cleanup
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@${EC2_IP} "rm -f /tmp/db_script.sql /home/ubuntu/app/run-sql.cjs" 2>/dev/null

    if [ $exit_code -eq 0 ]; then
        print_success "$description completed successfully"
    else
        print_error "$description failed (exit code: $exit_code)"
    fi

    return $exit_code
}

# --- Main ---
check_ssh_key

case "${1:-}" in
    ddl)
        upload_and_run_sql "$SCRIPT_DIR/ddl.sql" "DDL Script (Create Tables)"
        ;;

    dml)
        upload_and_run_sql "$SCRIPT_DIR/dml.sql" "DML Script (Insert Sample Data)"
        ;;

    queries)
        upload_and_run_sql "$SCRIPT_DIR/queries.sql" "Query Script (Inspect Database)"
        ;;

    all)
        print_header "Full Database Reset & Seed"
        print_warning "This will DROP all tables, recreate them, and insert sample data."
        echo ""
        read -p "Are you sure? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "Cancelled."
            exit 0
        fi

        upload_and_run_sql "$SCRIPT_DIR/ddl.sql" "Step 1/3: DDL (Create Tables)"
        if [ $? -ne 0 ]; then exit 1; fi

        upload_and_run_sql "$SCRIPT_DIR/dml.sql" "Step 2/3: DML (Insert Data)"
        if [ $? -ne 0 ]; then exit 1; fi

        upload_and_run_sql "$SCRIPT_DIR/queries.sql" "Step 3/3: Queries (Verify Data)"
        print_header "Full Reset Complete!"
        ;;

    custom)
        if [ -z "${2:-}" ]; then
            print_error "Please specify a SQL file: $0 custom <file.sql>"
            exit 1
        fi
        upload_and_run_sql "$2" "Custom Script: $(basename $2)"
        ;;

    status)
        print_header "Database Connection Status"
        echo "Checking connection to RDS via EC2..."
        echo ""

        # Create a status query
        cat > /tmp/status_query.sql << 'EOSQL'
SELECT version() AS postgres_version;
SELECT current_database() AS database, current_user AS connected_user;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'activities', COUNT(*) FROM activities
EOSQL
        upload_and_run_sql "/tmp/status_query.sql" "Database Status Check"
        rm -f /tmp/status_query.sql
        ;;

    *)
        show_usage
        exit 1
        ;;
esac
