#!/bin/bash
echo "🚀 Deploying SynthGen..."
echo ""
echo "Building and starting containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo ""
echo "✅ SynthGen is running!"
echo ""
echo "Frontend:  http://localhost"
echo "Backend:   http://localhost:8000"
echo "API Docs:  http://localhost:8000/docs"
echo ""
echo "To view logs:   docker-compose logs -f"
echo "To stop:        docker-compose down"
