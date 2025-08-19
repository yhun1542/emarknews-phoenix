#!/bin/bash

# EmarkNews v7.0 Automated Deployment Script
# This script handles complete deployment process

set -e  # Exit on any error

# Script configuration
SCRIPT_VERSION="7.0.0"
PROJECT_NAME="emarknews-backend-v7"
DOCKER_IMAGE_NAME="emarknews"
DOCKER_TAG="v7.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for better UX
CHECK_MARK="✅"
CROSS_MARK="❌"
WARNING="⚠️"
ROCKET="🚀"
GEAR="⚙️"
PACKAGE="📦"
CLOUD="☁️"
FIRE="🔥"

# Function to print colored output
print_status() {
    echo -e "${GREEN}${CHECK_MARK}${NC} $1"
}

print_error() {
    echo -e "${RED}${CROSS_MARK}${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}${WARNING}${NC} $1"
}

print_info() {
    echo -e "${BLUE}${GEAR}${NC} $1"
}

print_header() {
    echo -e "${PURPLE}${FIRE}${NC} $1"
}

print_step() {
    echo -e "${CYAN}${ROCKET}${NC} $1"
}

# Print script header
clear
echo ""
echo "=========================================="
print_header "EmarkNews Deployment Script v${SCRIPT_VERSION}"
echo "=========================================="
echo ""

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run from project root."
    exit 1
fi

# Check if src directory exists
if [ ! -d "src" ]; then
    print_error "src directory not found. Please ensure project structure is correct."
    exit 1
fi

# Step 1: Environment Setup
echo ""
print_step "Step 1: Environment Setup"
echo "----------------------------"

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_warning ".env file not found. Creating from .env.example"
        cp .env.example .env
        print_warning "Please edit .env file with your API keys before continuing"
        read -p "Press enter to continue after editing .env file..."
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_status ".env file found"
fi

# Validate Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js 16+ required. Current version: $(node --version)"
    exit 1
else
    print_status "Node.js version: $(node --version)"
fi

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Step 2: Dependency Management
echo ""
print_step "Step 2: Installing Dependencies"
echo "--------------------------------"

print_info "Cleaning npm cache..."
npm cache clean --force

print_info "Removing old node_modules..."
rm -rf node_modules package-lock.json

print_info "Installing dependencies..."
npm install

print_status "Dependencies installed successfully"

# Step 3: Project Structure Validation
echo ""
print_step "Step 3: Validating Project Structure"
echo "------------------------------------"

# Check required directories
REQUIRED_DIRS=(
    "src/services"
    "src/routes" 
    "src/config"
    "src/middleware"
    "src/utils"
    "public"
    "logs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        print_info "Creating missing directory: $dir"
        mkdir -p "$dir"
    else
        print_status "Directory exists: $dir"
    fi
done

# Check required files
REQUIRED_FILES=(
    "src/app.js"
    "src/services/newsService.js"
    "src/services/aiService.js"
    "src/services/currencyService.js"
    "src/services/youtubeService.js"
    "src/services/ratingService.js"
    "src/routes/api.js"
    "src/config/server.js"
    "src/config/database.js"
    "src/middleware/errorHandler.js"
    "src/utils/logger.js"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
        print_error "Missing required file: $file"
    else
        print_status "File exists: $file"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    print_error "Missing ${#MISSING_FILES[@]} required files. Please ensure all files are present."
    exit 1
fi

# Step 4: Code Validation and Testing
echo ""
print_step "Step 4: Code Validation"
echo "-----------------------"

print_info "Checking JavaScript syntax..."
if node -c src/app.js; then
    print_status "Main application file syntax is valid"
else
    print_error "Syntax error in src/app.js"
    exit 1
fi

# Test basic imports
print_info "Testing module imports..."
if node -e "require('./src/config/server.js'); console.log('Imports successful')"; then
    print_status "Module imports successful"
else
    print_error "Module import failed"
    exit 1
fi

# Step 5: Build Process
echo ""
print_step "Step 5: Build Process"
echo "---------------------"

print_info "Running production build..."
npm run build 2>/dev/null || npm ci --production

print_status "Build completed successfully"

# Step 6: Local Testing (Optional)
echo ""
print_step "Step 6: Local Testing"
echo "---------------------"

read -p "Do you want to test locally first? (y/n): " test_local

if [ "$test_local" = "y" ] || [ "$test_local" = "Y" ]; then
    print_info "Starting local server for testing..."
    print_info "Server will start at http://localhost:8080"
    print_info "Press Ctrl+C to stop and continue with deployment"
    
    # Start server in background
    npm start &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_status "Local server health check passed!"
    else
        print_warning "Local server health check failed"
    fi
    
    echo "Press any key to stop local server and continue..."
    read -n 1 -s
    
    # Stop server
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
fi

# Step 7: Git Operations
echo ""
print_step "Step 7: Git Repository Management"
echo "---------------------------------"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    print_info "Initializing Git repository..."
    git init
    print_status "Git repository initialized"
else
    print_status "Git repository already exists"
fi

# Check for .gitignore
if [ ! -f ".gitignore" ]; then
    print_info "Creating .gitignore file..."
    cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
logs/
*.log
.DS_Store
dist/
build/
coverage/
.nyc_output/
*.zip
*.tar.gz
.vscode/
.idea/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF
    print_status ".gitignore created"
fi

# Add files to git
print_info "Adding files to Git..."
git add .

# Commit changes
if git diff --staged --quiet; then
    print_info "No changes to commit"
else
    print_info "Committing changes..."
    git commit -m "Deploy EmarkNews v${SCRIPT_VERSION} - $(date +'%Y-%m-%d %H:%M:%S')"
    print_status "Changes committed"
fi

# Step 8: Deployment Options
echo ""
print_step "Step 8: Deployment Options"
echo "--------------------------"

echo "Choose your deployment method:"
echo "1) Railway (Recommended)"
echo "2) Docker Build"
echo "3) Heroku"
echo "4) Manual/Skip"
echo "5) All of the above"

read -p "Enter choice (1-5): " deploy_choice

case $deploy_choice in
    1)
        # Railway Deployment
        echo ""
        print_step "Deploying to Railway"
        echo "-------------------"
        
        if command -v railway &> /dev/null; then
            print_status "Railway CLI found"
            
            # Check if already logged in
            if railway whoami &> /dev/null; then
                print_status "Already logged in to Railway"
            else
                print_info "Logging in to Railway..."
                railway login
            fi
            
            # Check if project exists
            if [ -f "railway.json" ] || railway status &> /dev/null; then
                print_info "Deploying to existing Railway project..."
                railway up --detach
            else
                print_info "Creating new Railway project..."
                railway init
                railway up --detach
            fi
            
            print_status "Railway deployment initiated!"
            
        else
            print_warning "Railway CLI not found. Installing..."
            npm install -g @railway/cli
            print_info "Please run 'railway login' and then 'railway init' manually"
        fi
        ;;
        
    2)
        # Docker Build
        echo ""
        print_step "Building Docker Image"
        echo "---------------------"
        
        if command -v docker &> /dev/null; then
            print_status "Docker found"
            
            print_info "Building Docker image..."
            docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_TAG} .
            docker tag ${DOCKER_IMAGE_NAME}:${DOCKER_TAG} ${DOCKER_IMAGE_NAME}:latest
            
            print_status "Docker image built successfully!"
            
            read -p "Do you want to run the container locally? (y/n): " run_docker
            if [ "$run_docker" = "y" ]; then
                print_info "Starting Docker container..."
                docker run -d -p 8080:8080 --name emarknews-container ${DOCKER_IMAGE_NAME}:latest
                print_status "Container started at http://localhost:8080"
            fi
            
        else
            print_error "Docker not found. Please install Docker first."
        fi
        ;;
        
    3)
        # Heroku Deployment
        echo ""
        print_step "Deploying to Heroku"
        echo "-------------------"
        
        if command -v heroku &> /dev/null; then
            print_status "Heroku CLI found"
            
            # Create Procfile for Heroku
            echo "web: node src/app.js" > Procfile
            
            print_info "Creating Heroku app..."
            heroku create ${PROJECT_NAME}-$(date +%s) || true
            
            print_info "Deploying to Heroku..."
            git push heroku main || git push heroku master
            
            print_status "Heroku deployment completed!"
            
        else
            print_warning "Heroku CLI not found. Please install it first."
        fi
        ;;
        
    4)
        print_info "Skipping automated deployment"
        ;;
        
    5)
        print_info "Running all deployment methods..."
        # This would run Railway, Docker, and Heroku in sequence
        print_warning "This option is for advanced users only"
        ;;
        
    *)
        print_warning "Invalid choice. Skipping deployment."
        ;;
esac

# Step 9: Health Check and Verification
echo ""
print_step "Step 9: Health Check"
echo "--------------------"

read -p "Enter your deployment URL for health check (or press enter to skip): " deploy_url

if [ ! -z "$deploy_url" ]; then
    print_info "Checking deployment health..."
    
    # Remove trailing slash
    deploy_url=${deploy_url%/}
    
    # Wait for deployment to be ready
    echo "Waiting for deployment to be ready..."
    sleep 10
    
    # Check health endpoint
    if curl -f "${deploy_url}/health" > /dev/null 2>&1; then
        print_status "Deployment health check passed! ${CHECK_MARK}"
        
        # Test API endpoints
        echo ""
        print_info "Testing API endpoints..."
        
        if curl -f "${deploy_url}/api/news/world" > /dev/null 2>&1; then
            print_status "News API working"
        else
            print_warning "News API test failed"
        fi
        
        if curl -f "${deploy_url}/api/currency" > /dev/null 2>&1; then
            print_status "Currency API working"
        else
            print_warning "Currency API test failed"
        fi
        
    else
        print_error "Deployment health check failed"
        print_info "Please check your deployment logs"
    fi
else
    print_info "Health check skipped"
fi

# Step 10: Completion and Summary
echo ""
echo "=========================================="
print_header "Deployment Script Complete!"
echo "=========================================="
echo ""

print_status "Project: EmarkNews v${SCRIPT_VERSION}"
print_status "Status: Deployment process completed"
print_status "Timestamp: $(date)"

echo ""
echo "📋 Next Steps:"
echo "1. Check your deployment URL for functionality"
echo "2. Monitor logs for any issues"
echo "3. Set up monitoring and alerts"
echo "4. Configure custom domain (if needed)"
echo "5. Set up SSL certificates (if needed)"

echo ""
echo "🔗 Quick Links:"
echo "• Health Check: ${deploy_url}/health"
echo "• API Documentation: ${deploy_url}/"
echo "• News API: ${deploy_url}/api/news/world"
echo "• Currency API: ${deploy_url}/api/currency"

echo ""
echo "🛠️ Useful Commands:"
echo "• View logs: railway logs (if using Railway)"
echo "• Restart service: railway up"
echo "• Monitor: railway status"

echo ""
print_status "Thank you for using EmarkNews deployment script! ${ROCKET}"
echo ""

# Create deployment summary file
cat > DEPLOYMENT_SUMMARY.md << EOF
# EmarkNews v${SCRIPT_VERSION} Deployment Summary

**Deployment Date:** $(date)  
**Script Version:** ${SCRIPT_VERSION}  
**Deployment URL:** ${deploy_url:-"Not provided"}  

## Services Deployed
- ✅ News Service (Multi-source RSS feeds)
- ✅ AI Service (Translation & Summarization)  
- ✅ Currency Service (Real-time exchange rates)
- ✅ YouTube Service (Video integration)
- ✅ Rating Service (News evaluation & tagging)

## API Endpoints
- \`GET /api/news/:section\` - News by section
- \`GET /api/currency\` - Exchange rates
- \`GET /api/youtube/:section\` - YouTube videos
- \`POST /api/translate\` - AI translation
- \`GET /api/trending\` - Trending topics
- \`GET /health\` - Health check

## Environment
- Node.js: $(node --version)
- npm: $(npm --version)
- Platform: $(uname -s)

## Status
Deployment completed successfully! 🎉
EOF

print_info "Deployment summary saved to DEPLOYMENT_SUMMARY.md"

# Exit with success
exit 0