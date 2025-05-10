#!/bin/bash
set -e  # Exit on errors (except those we handle manually)

EXTRACT_DIR=$1
TOKEN=$2

PROJECT_ROOT="shared/project-dir"
EXTRACT_PATH="$PROJECT_ROOT/$EXTRACT_DIR"

echo "📦 Using extract dir: $EXTRACT_DIR"
echo "🔐 Using token: $TOKEN"
echo "🔧 Setting up environment in $EXTRACT_PATH"

# Create base project directory if it doesn't exist
mkdir -p "$PROJECT_ROOT"

cd "$PROJECT_ROOT"

# Initialize and install cucumber-js
if [ ! -f package.json ]; then
  echo "📦 Initializing npm project in $PROJECT_ROOT"
  npm init -y
fi

npm install @dev-blinq/cucumber-js@stage



# Download and install runtime dependencies using provided token
(npx cross-env NODE_ENV_BLINQ=stage node ./node_modules/@dev-blinq/cucumber-js/bin/download-install.js \
  --token "$TOKEN" \
  --extractDir "$EXTRACT_DIR")

cd "$EXTRACT_DIR"

# Initialize and install cucumber client
if [ ! -f package.json ]; then
  echo "📦 Initializing npm project in $EXTRACT_PATH"
  npm init -y
fi

npm install @dev-blinq/cucumber_client@stage

# Install Playwright (optional step – won't fail the script if it already exists)
npx playwright install || echo "⚠️  Playwright install failed or already complete"

echo "✅ Environment ready at $EXTRACT_PATH"
