#!/bin/bash

# Simple Cosmos AI Deployment Script
set -e

echo "🚀 Deploying Cosmos AI..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "✅ Created .env from env.example"
    echo "⚠️  Please edit .env with your production values!"
    exit 1
fi

# Git operations
echo "📥 Updating code..."

git checkout feature
git pull origin feature

# Docker operations
echo "🐳 Building and starting services..."
docker compose build --no-cache
docker compose --profile prod-only up -d

echo "✅ Deployment complete!"
echo "🌐 App: http://localhost:3000"
echo "📊 Status: docker compose ps"
echo "📋 Logs: docker compose logs -f"