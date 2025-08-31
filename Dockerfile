# Multi-stage Dockerfile for optimized production builds
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --no-audit

# Copy source code
COPY src/ ./src/

# Build the TypeScript application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-audit && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist/

# Copy data directory if it exists
COPY --chown=nodejs:nodejs data/ ./data/

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application with optimized Node.js flags
CMD ["node", "--max-old-space-size=4096", "dist/index.js"]