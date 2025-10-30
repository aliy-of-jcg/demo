# Docker Deployment Guide for Naver Cloud Platform

## Prerequisites

1. **Docker and Docker Compose** installed on your local machine
2. **Naver Cloud Platform account** with Container Registry access
3. **Environment variables** configured for production

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your production values:

```bash
cp env.example .env
```

Edit `.env` with your production values:
- Database passwords (use strong, unique passwords)
- JWT and NextAuth secrets (generate secure random strings)
- Your production domain URL

### 2. Using the Deployment Script

The easiest way to manage your application is using the provided `deploy.sh` script:

```bash
# Make script executable (if not already)
chmod +x deploy.sh

# Development environment
./deploy.sh dev start      # Start development
./deploy.sh dev stop       # Stop development
./deploy.sh dev logs       # View development logs
./deploy.sh dev restart    # Restart development

# Production environment
./deploy.sh prod start     # Start production
./deploy.sh prod stop      # Stop production
./deploy.sh prod logs      # View production logs
./deploy.sh prod restart   # Restart production

# Utility commands
./deploy.sh status         # Check service status
./deploy.sh health         # Check application health
./deploy.sh backup         # Create database backup
./deploy.sh clean          # Clean up Docker resources
```

### 3. Manual Docker Commands

If you prefer using Docker Compose directly:

```bash
# Development (with port exposure for debugging)
docker-compose --profile dev up -d

# Production (no database port exposure)
docker-compose --profile prod-only up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Test the application
curl http://localhost:3000/api/health
```

## Naver Cloud Platform Deployment

### Option 1: Container Registry + Container Service

1. **Build and push your image:**
   ```bash
   # Build the image
   docker build -t your-registry/cosmos-ai:latest .
   
   # Push to Naver Container Registry
   docker push your-registry/cosmos-ai:latest
   ```

2. **Deploy using Container Service:**
   - Create a new container service in Naver Cloud Platform
   - Use your pushed image
   - Configure environment variables
   - Set up load balancer if needed

### Option 2: VM with Docker Compose

1. **Create a VM** in Naver Cloud Platform
2. **Install Docker and Docker Compose** on the VM
3. **Upload your project files** to the VM
4. **Run the production compose file:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Service Management

### Useful Commands

```bash
# View all services
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Update and restart services
docker-compose pull
docker-compose up -d
```

### Health Checks

- **App Health:** `http://your-domain:3000/api/health`
- **MySQL:** Automatically checked by Docker
- **ClickHouse:** Automatically checked by Docker

## Security Considerations

1. **Change default passwords** in production
2. **Use HTTPS** with a reverse proxy (Nginx/Traefik)
3. **Limit port exposure** (use internal networks)
4. **Regular security updates** for base images
5. **Monitor logs** for suspicious activity

## Troubleshooting

### Common Issues

1. **Database connection errors:**
   - Check if databases are healthy: `docker-compose ps`
   - Verify environment variables
   - Check network connectivity

2. **App won't start:**
   - Check logs: `docker-compose logs app`
   - Verify all required environment variables are set
   - Ensure databases are healthy before app starts

3. **Port conflicts:**
   - Change port mappings in docker-compose.yml
   - Check if ports are already in use

### Logs and Monitoring

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs app
docker-compose logs mysql
docker-compose logs clickhouse

# Follow logs in real-time
docker-compose logs -f app
```

## Backup and Recovery

### Database Backups

```bash
# MySQL backup
docker-compose exec mysql mysqldump -u root -p appdb > backup.sql

# ClickHouse backup
docker-compose exec clickhouse clickhouse-client --query "BACKUP DATABASE analytics TO Disk('backups', 'analytics_backup')"
```

### Volume Backups

```bash
# Backup volumes
docker run --rm -v cosmos-ai_mysql-data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-data.tar.gz -C /data .
```
