# Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when running the Mallorca Travel Backend system.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Performance Problems](#performance-problems)
- [Data Issues](#data-issues)
- [Docker Issues](#docker-issues)
- [Network Issues](#network-issues)
- [Memory Issues](#memory-issues)
- [Debug Mode](#debug-mode)
- [Log Analysis](#log-analysis)
- [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Health Check Commands

```bash
# Check application health
curl http://localhost:3000/api/health

# Check system resources
free -h
df -h
top -p $(pgrep -f "node.*server")

# Check application status
npm run health
# or
node scripts/health-check.js
```

### System Status

```bash
# Check if service is running
ps aux | grep node
netstat -tulpn | grep 3000

# Check logs
tail -f logs/application.log
tail -f logs/error.log

# Check Docker status (if using Docker)
docker ps
docker logs mallorca-backend
```

## Common Issues

### 1. Application Won't Start

#### Symptoms
- Server fails to start
- Port binding errors
- Module not found errors

#### Solutions

**Check Port Availability:**
```bash
# Check if port 3000 is in use
lsof -i :3000
netstat -tulpn | grep 3000

# Kill process using port 3000
sudo kill -9 $(lsof -t -i:3000)

# Or use different port
export PORT=3001
npm start
```

**Missing Dependencies:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for peer dependency issues
npm ls
npm audit fix
```

**Environment Variables:**
```bash
# Check if .env file exists
ls -la .env

# Copy from example
cp .env.example .env

# Verify required variables
cat .env | grep -E "(PORT|DATA_PATH|OFFERS_DATA_PATH|HOTELS_DATA_PATH)"
```

### 2. Data Loading Failures

#### Symptoms
- "Data files not found" errors
- CSV parsing errors
- Memory errors during data loading

#### Solutions

**Check Data Files:**
```bash
# Verify data files exist
ls -la data/
wc -l data/offers.csv data/hotels.csv

# Check file permissions
chmod 644 data/*.csv

# Verify CSV format
head -5 data/offers.csv
head -5 data/hotels.csv
```

**CSV Format Issues:**
```bash
# Check for BOM (Byte Order Mark)
file data/offers.csv
hexdump -C data/offers.csv | head -1

# Remove BOM if present
sed -i '1s/^\xEF\xBB\xBF//' data/offers.csv

# Check for encoding issues
iconv -f UTF-8 -t UTF-8 data/offers.csv > /dev/null
```

**Large File Handling:**
```bash
# Check available memory
free -h

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm start

# Enable streaming mode
echo "STREAMING_CHUNK_SIZE=5000" >> .env
echo "ENABLE_MEMORY_MONITORING=true" >> .env
```

### 3. Slow Performance

#### Symptoms
- Response times > 1 second
- High CPU usage
- Memory usage continuously increasing

#### Solutions

**Enable Ultra-Performance Mode:**
```bash
# Add to .env file
echo "ENABLE_ULTRA_PERFORMANCE=true" >> .env
echo "ULTRA_USE_COLUMNAR_STORAGE=true" >> .env
echo "ULTRA_USE_BITSET_INDEXES=true" >> .env
echo "ULTRA_USE_PARALLEL_PROCESSING=true" >> .env

# Restart application
npm restart
```

**System Optimization:**
```bash
# Increase system limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 4. Out of Memory Errors

#### Symptoms
- "JavaScript heap out of memory" errors
- Process crashes
- System becomes unresponsive

#### Solutions

**Increase Memory Limits:**
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=8192"  # 8GB

# For very large datasets
export NODE_OPTIONS="--max-old-space-size=16384" # 16GB

# Enable memory monitoring
echo "ENABLE_MEMORY_MONITORING=true" >> .env
echo "MEMORY_THRESHOLD_MB=6000" >> .env
```

**Memory Optimization:**
```bash
# Enable garbage collection optimization
export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=100"
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"

# Reduce data processing chunk size
echo "STREAMING_CHUNK_SIZE=1000" >> .env
echo "GC_INTERVAL=25" >> .env
```

## Performance Problems

### High CPU Usage

#### Diagnosis
```bash
# Monitor CPU usage
top -p $(pgrep -f "node.*server")
htop

# Check for CPU-intensive queries
tail -f logs/application.log | grep "slow query"

# Profile CPU usage
node --prof server.js
# After running, process the profile
node --prof-process isolate-*.log > cpu-profile.txt
```

#### Solutions
```bash
# Enable parallel processing
echo "ULTRA_USE_PARALLEL_PROCESSING=true" >> .env
echo "UV_THREADPOOL_SIZE=128" >> .env

# Use clustering
npm install -g pm2
pm2 start ecosystem.config.js
```

### Memory Leaks

#### Diagnosis
```bash
# Monitor memory usage over time
while true; do
  ps -p $(pgrep -f "node.*server") -o pid,vsz,rss,pmem,time
  sleep 30
done

# Generate heap snapshot
node --inspect server.js
# Connect Chrome DevTools to analyze memory
```

#### Solutions
```bash
# Enable automatic garbage collection
echo "GC_INTERVAL=50" >> .env

# Use memory profiling tools
npm install -g clinic
clinic doctor -- node server.js
```

### Slow Database Queries

#### Diagnosis
```bash
# Enable query logging
echo "LOG_LEVEL=debug" >> .env

# Monitor slow queries
tail -f logs/application.log | grep "Query took"

# Check data file sizes
ls -lh data/
```

#### Solutions
```bash
# Optimize indexing
echo "ULTRA_USE_BITSET_INDEXES=true" >> .env
echo "ENABLE_STREAMING_INDEX_BUILDING=true" >> .env

# Reduce query complexity
echo "ULTRA_MAX_OFFERS=50000000" >> .env  # Reduce if needed
```

## Data Issues

### CSV Parsing Errors

#### Common Error Messages
```
Error: Invalid CSV format at line 12345
Error: Missing required column 'hotelid'
Error: Invalid date format in 'departuredate'
```

#### Solutions

**Validate CSV Structure:**
```bash
# Check CSV headers
head -1 data/offers.csv
head -1 data/hotels.csv

# Count columns
head -1 data/offers.csv | tr ',' '\n' | wc -l

# Find lines with wrong column count
awk -F',' 'NF!=expected_columns {print NR, NF, $0}' data/offers.csv
```

**Fix Common Issues:**
```bash
# Remove empty lines
sed -i '/^$/d' data/offers.csv

# Fix line endings
dos2unix data/offers.csv data/hotels.csv

# Remove quotes if causing issues
sed -i 's/"//g' data/offers.csv
```

### Data Validation Errors

#### Symptoms
- Invalid hotel IDs
- Date format errors
- Price validation failures

#### Solutions

**Run Data Validation:**
```bash
# Validate data files
npm run validate

# Check specific validation errors
node scripts/validate-data.js --verbose
```

**Fix Data Issues:**
```bash
# Remove invalid records
node scripts/clean-data.js

# Regenerate indexes
npm run setup
```

## Docker Issues

### Container Won't Start

#### Diagnosis
```bash
# Check Docker status
docker ps -a
docker logs mallorca-backend

# Check image
docker images | grep mallorca

# Check Docker daemon
sudo systemctl status docker
```

#### Solutions

**Rebuild Container:**
```bash
# Remove old container and image
docker stop mallorca-backend
docker rm mallorca-backend
docker rmi mallorca-backend

# Rebuild
docker build -t mallorca-backend .
docker run -d --name mallorca-backend -p 3000:3000 mallorca-backend
```

**Volume Issues:**
```bash
# Check volume mounts
docker inspect mallorca-backend | grep -A 10 "Mounts"

# Fix permissions
sudo chown -R 1000:1000 ./data ./logs

# Recreate with correct volumes
docker run -d \
  --name mallorca-backend \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  mallorca-backend
```

### Docker Compose Issues

#### Common Problems
```bash
# Service dependencies
docker-compose logs backend
docker-compose logs nginx

# Network issues
docker network ls
docker network inspect mallorca_default

# Port conflicts
docker-compose ps
netstat -tulpn | grep -E "(80|443|3000)"
```

#### Solutions
```bash
# Recreate services
docker-compose down
docker-compose up -d --force-recreate

# Check service health
docker-compose exec backend curl http://localhost:3000/api/health
```

## Network Issues

### Connection Refused

#### Symptoms
- "Connection refused" errors
- Timeouts
- 502 Bad Gateway (with proxy)

#### Solutions

**Check Service Status:**
```bash
# Verify service is running
curl -v http://localhost:3000/api/health

# Check firewall
sudo ufw status
sudo iptables -L

# Check if binding to correct interface
netstat -tulpn | grep 3000
```

**Fix Binding Issues:**
```bash
# Bind to all interfaces
echo "HOST=0.0.0.0" >> .env

# Or specific interface
echo "HOST=192.168.1.100" >> .env
```

### Proxy Issues

#### Nginx Configuration Problems
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Reload configuration
sudo nginx -s reload
```

#### Fix Common Proxy Issues
```nginx
# Add to nginx configuration
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Increase timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

## Memory Issues

### Memory Monitoring

```bash
# Monitor memory usage
watch -n 5 'free -h && ps aux --sort=-%mem | head -10'

# Check swap usage
swapon --show
vmstat 5

# Monitor Node.js memory
node -e "setInterval(() => console.log(process.memoryUsage()), 5000)"
```

### Memory Optimization

```bash
# Clear system cache
sudo sync
sudo echo 3 > /proc/sys/vm/drop_caches

# Optimize swap
sudo sysctl vm.swappiness=10

# Increase virtual memory
sudo sysctl vm.max_map_count=262144
```

## Debug Mode

### Enable Debug Logging

```bash
# Enable debug mode
echo "LOG_LEVEL=debug" >> .env
echo "NODE_ENV=development" >> .env

# Enable Node.js debugging
export NODE_OPTIONS="--inspect=0.0.0.0:9229"
npm start

# Connect debugger
# Chrome: chrome://inspect
# VS Code: Attach to Node.js process
```

### Debug Specific Components

```bash
# Debug data loading
DEBUG=data:* npm start

# Debug API requests
DEBUG=api:* npm start

# Debug performance
DEBUG=perf:* npm start

# Debug all
DEBUG=* npm start
```

### Performance Profiling

```bash
# CPU profiling
node --prof server.js
# After running: node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect --heap-prof server.js

# Use clinic.js for comprehensive analysis
npm install -g clinic
clinic doctor -- node server.js
clinic flame -- node server.js
clinic bubbleprof -- node server.js
```

## Log Analysis

### Log Locations

```bash
# Application logs
tail -f logs/application.log
tail -f logs/error.log
tail -f logs/access.log

# System logs
sudo journalctl -u mallorca-backend -f

# Docker logs
docker logs -f mallorca-backend

# PM2 logs
pm2 logs mallorca-backend
```

### Common Log Patterns

```bash
# Find errors
grep -i error logs/application.log

# Find slow queries
grep "Query took" logs/application.log | awk '$4 > 1000'

# Find memory warnings
grep -i "memory" logs/application.log

# Find connection issues
grep -i "connection" logs/error.log
```

### Log Analysis Tools

```bash
# Install log analysis tools
npm install -g bunyan  # For JSON logs
pip install logparser   # For structured analysis

# Analyze logs
cat logs/application.log | bunyan
logparser --input logs/access.log --format combined
```

## Emergency Procedures

### Service Recovery

```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery..."

# Stop all services
pm2 stop all 2>/dev/null
docker-compose down 2>/dev/null
pkill -f "node.*server" 2>/dev/null

# Clear temporary files
rm -rf /tmp/mallorca-*
rm -rf logs/*.log

# Check system resources
echo "System resources:"
free -h
df -h

# Restart with minimal configuration
echo "ENABLE_ULTRA_PERFORMANCE=false" > .env.recovery
echo "STREAMING_CHUNK_SIZE=1000" >> .env.recovery
echo "LOG_LEVEL=error" >> .env.recovery

# Start service
cp .env.recovery .env
npm start

echo "Recovery complete. Check http://localhost:3000/api/health"
```

### Data Recovery

```bash
#!/bin/bash
# data-recovery.sh

echo "Starting data recovery..."

# Backup current data
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
cp -r data/ backup/$(date +%Y%m%d_%H%M%S)/

# Validate data files
if [ ! -f "data/offers.csv" ]; then
    echo "ERROR: offers.csv not found"
    exit 1
fi

if [ ! -f "data/hotels.csv" ]; then
    echo "ERROR: hotels.csv not found"
    exit 1
fi

# Check file integrity
wc -l data/*.csv
file data/*.csv

# Rebuild indexes
npm run setup

echo "Data recovery complete"
```

### System Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== System Health Check ==="

# Check system resources
echo "Memory usage:"
free -h

echo "Disk usage:"
df -h

echo "CPU load:"
uptime

# Check application
echo "Application status:"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✓ Application is responding"
else
    echo "✗ Application is not responding"
fi

# Check data files
echo "Data files:"
if [ -f "data/offers.csv" ] && [ -f "data/hotels.csv" ]; then
    echo "✓ Data files present"
    wc -l data/*.csv
else
    echo "✗ Data files missing"
fi

# Check logs for errors
echo "Recent errors:"
tail -20 logs/error.log 2>/dev/null || echo "No error log found"

echo "=== Health Check Complete ==="
```

## Getting Help

### Diagnostic Information

When reporting issues, include:

```bash
# System information
uname -a
node --version
npm --version
docker --version

# Application status
curl -s http://localhost:3000/api/health | jq .
ps aux | grep node

# Resource usage
free -h
df -h
top -b -n 1 | head -20

# Recent logs
tail -50 logs/application.log
tail -20 logs/error.log
```

### Support Channels

- **Documentation**: [README.md](./README.md)
- **Performance**: [PERFORMANCE.md](./PERFORMANCE.md)
- **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API**: [API.md](./API.md)
- **Issues**: GitHub Issues

### Emergency Contacts

For critical production issues:
1. Check system health immediately
2. Run emergency recovery procedures
3. Document the issue with diagnostic information
4. Contact support with full details

---

**Remember**: Always backup your data before making significant changes, and test solutions in a development environment first.