#!/bin/bash
set -e

echo "▶️  Starting container..."

if [ -z "$EXTRACT_DIR" ]; then
  echo "❌ EXTRACT_DIR not set"
  exit 1
fi

if [ -z "$BLINQ_TOKEN" ]; then
  echo "❌ BLINQ_TOKEN not set"
  exit 1
fi

if [ -z "$EXECUTION_ID" ]; then
  echo "❌ EXECUTION_ID not set"
  exit 1
fi

echo "📦 Using extract dir: $EXTRACT_DIR"
node -v
echo "🔐 Using token: $BLINQ_TOKEN"

npm run build

# if [ "$AGENT_MODE" = "true" ]; then
#   echo "🧠 Starting in agent mode..."
#   node dist/agent-entry.js
#   exit 0
# fi

# # Fallback to setup mode
# ./environment-setup.sh "$EXTRACT_DIR" "$BLINQ_TOKEN"
exit 0