#!/bin/bash

# Vulnerable NestJS Shop - Setup Script
# This script sets up the intentionally vulnerable application for educational purposes

echo "🔴 VULNERABLE NESTJS SHOP SETUP 🔴"
echo "=================================="
echo ""
echo "⚠️  WARNING: This application contains intentional security vulnerabilities!"
echo "⚠️  DO NOT use in production or deploy to public environments!"
echo "⚠️  For educational purposes only!"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version is $NODE_VERSION. Recommended version is 18+."
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "Node.js and npm are available"

# Check if Docker is available (optional)
if command_exists docker; then
    print_status "Docker is available for containerized testing"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found. You can still run the app locally, but containerized testing won't be available."
    DOCKER_AVAILABLE=false
fi

echo ""
echo "🚀 Setting up Vulnerable NestJS Shop..."
echo ""

# Install dependencies
print_status "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Create necessary directories
print_status "Creating directories..."
mkdir -p uploads logs config backups
chmod 777 uploads logs config backups  # Intentionally insecure permissions

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Setup database
print_status "Setting up database..."
npx prisma db push --accept-data-loss

# Seed database with vulnerable data
print_status "Seeding database with test data (including weak passwords)..."
npm run prisma:seed

# Create some test files for upload testing
print_status "Creating test files for vulnerability testing..."
echo "This is a test text file" > uploads/test.txt
echo "#!/bin/bash\necho 'This would be dangerous in production'" > uploads/test.sh
chmod +x uploads/test.sh

# Create a fake sensitive file for testing directory traversal
echo "root:x:0:0:root:/root:/bin/bash" > uploads/fake_passwd
echo "admin:password123" > uploads/sensitive_config.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 How to use this vulnerable application:"
echo ""
echo "1. 🎯 Local Development:"
echo "   npm run start:dev"
echo "   Access at: http://localhost:3000"
echo "   Swagger docs: http://localhost:3000/api"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
echo "2. 🐳 Docker Testing (Recommended for full vulnerability testing):"
echo "   docker-compose up --build"
echo "   Multiple services will be exposed on various ports"
echo ""
fi

echo "3. 📖 Documentation:"
echo "   README.md - Full documentation and testing examples"
echo "   SECURITY.md - Detailed vulnerability reference"
echo "   Postman collection - Vulnerable-Shop-API.postman_collection.json"
echo ""
echo "4. 🔑 Test Credentials:"
echo "   Admin: admin@shop.com / password123"
echo "   User 1: john@example.com / 123456"
echo "   User 2: jane@example.com / qwerty"
echo ""
echo "⚠️  SECURITY REMINDERS:"
print_warning "This application is INTENTIONALLY VULNERABLE"
print_warning "Contains OWASP Top 10 vulnerabilities and more"
print_warning "DO NOT deploy to production environments"
print_warning "DO NOT expose to public networks"
print_warning "Use only in isolated, controlled environments"
print_warning "Designed for security education and training"
echo ""
echo "🎓 Learning Objectives:"
echo "   • Understand common web application vulnerabilities"
echo "   • Practice security testing techniques"
echo "   • Learn secure coding practices by seeing what NOT to do"
echo "   • Explore container security issues"
echo ""
echo "Happy (ethical) hacking! 🔓"
echo ""

# Final security warning
echo -e "${RED}=================================="
echo "⚠️  FINAL WARNING ⚠️"
echo "This software is intentionally vulnerable"
echo "Use responsibly and ethically"
echo "For educational purposes only"
echo -e "==================================${NC}"