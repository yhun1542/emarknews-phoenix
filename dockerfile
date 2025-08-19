# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install Python and build tools for native dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with production flag
RUN npm ci --only=production && \
    npm cache clean --force

# Create necessary directories
RUN mkdir -p logs public src && \
    chown -R nextjs:nodejs /app

# Copy source code
COPY --chown=nextjs:nodejs src/ ./src/
COPY --chown=nextjs:nodejs public/ ./public/

# Copy configuration files
COPY --chown=nextjs:nodejs railway.json ./
COPY --chown=nextjs:nodejs .env.example ./

# Set proper permissions
RUN chmod -R 755 /app && \
    chmod -R 777 /app/logs

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const options = { \
      host: 'localhost', \
      port: 8080, \
      path: '/health', \
      timeout: 2000 \
    }; \
    const request = http.request(options, (res) => { \
      console.log('Health check status:', res.statusCode); \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    request.on('error', (err) => { \
      console.error('Health check failed:', err.message); \
      process.exit(1); \
    }); \
    request.end();" \
  || exit 1

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "src/app.js"]