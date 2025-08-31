# Deployment Guide

## Overview

This guide covers deployment options for the Mallorca Travel Backend, from local development to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 8 cores
- RAM: 24GB
- Storage: 50GB SSD
- Network: 1Gbps

**Recommended for Production:**
- CPU: 8+ cores
- RAM: 32GB+
- Storage: 100GB+ NVMe SSD
- Network: 10Gbps

### Software Dependencies

- Node.js 18+ (LTS recommended)
- npm 8+ or yarn 1.22+
- Docker 20+ (for containerized deployment)
- Docker Compose 2.0+

## Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/QsingularityAi/CHECK24-TechUp-Holiday-Challenge.git
cd CHECK24-TechUp-Holiday-Challenge

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Prepare data
mkdir -p data
# Copy your offers.csv and hotels.csv to data/ directory

# Run setup
npm run setup

# Start development server
npm run dev
```

### Development Configuration

```env
# .env for development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
ENABLE_ULTRA_PERFORMANCE=false
STREAMING_CHUNK_SIZE=1000
```

## Docker Deployment

### Single Container

```bash
# Build image
docker build -t mallorca-backend .

# Run container
docker run -d \
  --name mallorca-backend \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  mallorca-backend
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - ENABLE_ULTRA_PERFORMANCE=true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped
```

### Production Docker Setup

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Scale backend instances
docker-compose up -d --scale backend=3

# Monitor logs
docker-compose logs -f backend
```

## Production Deployment

### Environment Setup

```bash
# Create production user
sudo useradd -m -s /bin/bash mallorca
sudo usermod -aG docker mallorca

# Setup application directory
sudo mkdir -p /opt/mallorca-backend
sudo chown mallorca:mallorca /opt/mallorca-backend

# Switch to application user
sudo su - mallorca
cd /opt/mallorca-backend
```

### Production Configuration

```env
# .env.production
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Ultra-Performance Settings
ENABLE_ULTRA_PERFORMANCE=true
ULTRA_MAX_OFFERS=100000000
ULTRA_MAX_HOTELS=300000
ULTRA_USE_COLUMNAR_STORAGE=true
ULTRA_USE_MEMORY_MAPPING=true
ULTRA_USE_BITSET_INDEXES=true
ULTRA_USE_PARALLEL_PROCESSING=true

# Streaming Configuration
STREAMING_CHUNK_SIZE=10000
ENABLE_MEMORY_MONITORING=true
MEMORY_THRESHOLD_MB=12000
GC_INTERVAL=50

# Security
REQUEST_TIMEOUT=30000
MAX_REQUEST_SIZE=10mb

# Paths
DATA_PATH=/opt/mallorca-backend/data
LOGS_PATH=/opt/mallorca-backend/logs
```

### Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mallorca-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '2G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/mallorca-backend
upstream backend {
    server 127.0.0.1:3000;
    # Add more servers for load balancing
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://backend;
        access_log off;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Cloud Deployment

### AWS Deployment

#### EC2 Instance

```bash
# Launch EC2 instance (t3.large or larger)
# Install Docker and Docker Compose
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Deploy application
git clone <repository-url>
cd CHECK24-TechUp-Holiday-Challenge
docker-compose -f docker-compose.prod.yml up -d
```

#### ECS Deployment

```json
{
  "family": "mallorca-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "mallorca-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/mallorca-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mallorca-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

#### Cloud Run Deployment

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/mallorca-backend

# Deploy to Cloud Run
gcloud run deploy mallorca-backend \
  --image gcr.io/PROJECT-ID/mallorca-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 10
```

### Azure Container Instances

```bash
# Create resource group
az group create --name mallorca-rg --location eastus

# Deploy container
az container create \
  --resource-group mallorca-rg \
  --name mallorca-backend \
  --image your-registry/mallorca-backend:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000 \
  --environment-variables NODE_ENV=production
```

## Monitoring & Maintenance

### Health Monitoring

```bash
# Setup health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Service is healthy"
else
    echo "$(date): Service is unhealthy (HTTP $RESPONSE)"
    # Add alerting logic here
fi
EOF

chmod +x health-check.sh

# Add to crontab
echo "*/5 * * * * /opt/mallorca-backend/health-check.sh >> /var/log/health-check.log" | crontab -
```

### Log Rotation

```bash
# Setup logrotate
sudo cat > /etc/logrotate.d/mallorca-backend << 'EOF'
/opt/mallorca-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mallorca mallorca
    postrotate
        pm2 reload mallorca-backend
    endscript
}
EOF
```

### Backup Strategy

```bash
# Backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/mallorca-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup data files
cp -r /opt/mallorca-backend/data $BACKUP_DIR/

# Backup configuration
cp /opt/mallorca-backend/.env $BACKUP_DIR/
cp /opt/mallorca-backend/ecosystem.config.js $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR.tar.gz s3://your-backup-bucket/
EOF

chmod +x backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/mallorca-backend/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Adjust Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Restart with new settings
pm2 restart mallorca-backend
```

#### Performance Issues

```bash
# Check system resources
top
iotop
netstat -tulpn

# Analyze application logs
tail -f /opt/mallorca-backend/logs/application.log

# Check PM2 status
pm2 status
pm2 monit
```

#### Database Connection Issues

```bash
# Verify data files
ls -la /opt/mallorca-backend/data/
wc -l /opt/mallorca-backend/data/*.csv

# Check file permissions
chown -R mallorca:mallorca /opt/mallorca-backend/data/
```

### Emergency Procedures

#### Service Recovery

```bash
# Stop all services
pm2 stop all
docker-compose down

# Clear cache and restart
rm -rf /tmp/mallorca-cache/*
pm2 start ecosystem.config.js

# Verify recovery
curl http://localhost:3000/api/health
```

#### Rollback Deployment

```bash
# Rollback to previous version
git checkout <previous-commit>
npm run build
pm2 restart mallorca-backend

# Or rollback Docker deployment
docker-compose down
docker pull your-registry/mallorca-backend:previous-tag
docker-compose up -d
```

## Security Considerations

### SSL/TLS Configuration

```bash
# Generate SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Updates

```bash
# Setup automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Regular security audit
npm audit
docker scan your-registry/mallorca-backend:latest
```

## Performance Optimization

### System Tuning

```bash
# Optimize system limits
echo "mallorca soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "mallorca hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Application Tuning

```bash
# Optimize Node.js settings
export NODE_OPTIONS="--max-old-space-size=8192 --optimize-for-size"

# Enable clustering
export UV_THREADPOOL_SIZE=128

# Restart with optimizations
pm2 restart mallorca-backend
```

## Support

For deployment support:
- **Documentation**: [Main README](./README.md)
- **Performance**: [Performance Guide](./PERFORMANCE.md)
- **API**: [API Documentation](./API.md)
- **Issues**: GitHub Issues