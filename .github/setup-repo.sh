#!/bin/bash

# GitHub Repository Setup Script
# This script helps set up branch protection rules and environments

REPO_OWNER="canstralian"
REPO_NAME="copilot-build"

echo "🚀 Setting up GitHub repository: $REPO_OWNER/$REPO_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed. Please install it first:"
    echo "  - macOS: brew install gh"
    echo "  - Ubuntu: sudo apt install gh"
    echo "  - Windows: winget install GitHub.cli"
    exit 1
fi

# Check if user is logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    print_warning "You are not logged in to GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

print_status "GitHub CLI is ready"

# Create environments
echo ""
echo "🌍 Creating environments..."

# Staging environment
print_status "Creating staging environment"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/$REPO_OWNER/$REPO_NAME/environments/staging \
  -f name='staging' \
  -f wait_timer=0 \
  -f prevent_self_review=false \
  -F reviewers='[]' \
  -F deployment_branch_policy='{"protected_branches":false,"custom_branch_policies":true}' || print_warning "Staging environment may already exist"

# Production environment
print_status "Creating production environment"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/$REPO_OWNER/$REPO_NAME/environments/production \
  -f name='production' \
  -f wait_timer=300 \
  -f prevent_self_review=true \
  -F reviewers='[{"type":"User","id":null}]' \
  -F deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}' || print_warning "Production environment may already exist"

# Set up secrets (you'll need to set these manually)
echo ""
echo "🔐 Setting up repository secrets..."
print_warning "You need to manually add these secrets in GitHub:"
echo "  1. VSCE_PAT - VS Code Marketplace Personal Access Token"
echo "  2. SNYK_TOKEN - Snyk security scanning token"
echo "  3. Any other API keys or credentials"

# Set up branch protection rules
echo ""
echo "🛡️  Setting up branch protection rules..."

# Protect master branch
print_status "Setting up master branch protection"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/$REPO_OWNER/$REPO_NAME/branches/master/protection \
  -f required_status_checks='{"strict":true,"contexts":["quality","build","security"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
  -f restrictions=null || print_warning "Master branch protection may already exist"

# Protect develop branch
print_status "Setting up develop branch protection"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/$REPO_OWNER/$REPO_NAME/branches/develop/protection \
  -f required_status_checks='{"strict":true,"contexts":["quality","build"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f restrictions=null || print_warning "Develop branch protection may already exist"

echo ""
print_status "Repository setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Add required secrets in GitHub repository settings"
echo "  2. Review and adjust branch protection rules as needed"
echo "  3. Test CI/CD workflows with a pull request"
echo "  4. Configure additional integrations (Snyk, etc.)"

echo ""
echo "🔗 Useful links:"
echo "  - Repository: https://github.com/$REPO_OWNER/$REPO_NAME"
echo "  - Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "  - Security: https://github.com/$REPO_OWNER/$REPO_NAME/security"
echo "  - Settings: https://github.com/$REPO_OWNER/$REPO_NAME/settings"
