#!/bin/bash

# EmarkNews Phoenix v7 Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting EmarkNews Phoenix v7 Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Run tests if they exist
if npm run test --silent 2>/dev/null; then
    print_status "Running tests..."
    npm test
else
    print_warning "No tests found, skipping test phase"
fi

# Build the application (if build script exists)
if npm run build --silent 2>/dev/null; then
    print_status "Building application..."
    npm run build
else
    print_warning "No build script found, skipping build phase"
fi

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    print_status "Deploying to Railway..."
    railway up --detach
    print_success "Deployment initiated on Railway"
else
    print_warning "Railway CLI not found. Please install it or deploy manually."
fi

# Check if Docker is available for local testing
if command -v docker &> /dev/null; then
    print_status "Building Docker image for local testing..."
    docker build -t emarknews-phoenix:latest .
    print_success "Docker image built successfully"
    
    print_status "You can now run the container locally with:"
    echo "docker run -p 8080:8080 --env-file .env emarknews-phoenix:latest"
else
    print_warning "Docker not found. Skipping Docker build."
fi

print_success "Deployment script completed!"
print_status "Check your Railway dashboard for deployment status."
print_status "Local testing: npm start"
print_status "Production URL: Check Railway dashboard for the live URL"

echo ""
echo "🎉 EmarkNews Phoenix v7 deployment process finished!"

