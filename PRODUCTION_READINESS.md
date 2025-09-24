# Yellow Network Integration - Production Deployment Guide
# Phase 3.4: Production Readiness

## Environment Configuration

### Backend Environment Variables (.env.production)
```bash
# Yellow Network Configuration
YELLOW_NETWORK_WSS_URL=wss://clearnet.yellow.com/ws
YELLOW_NETWORK_API_URL=https://api.yellow.com/v1
YELLOW_NETWORK_PRIVATE_KEY=your_production_private_key
YELLOW_NETWORK_NODE_ID=your_production_node_id
YELLOW_NETWORK_TIMEOUT=10000
YELLOW_NETWORK_RETRY_ATTEMPTS=3

# Database Configuration  
MONGODB_URI=mongodb://production-cluster/yellownetwork
MONGODB_OPTIONS=retryWrites=true&w=majority

# RazorpayX Production
RAZORPAYX_KEY_ID=your_production_key_id
RAZORPAYX_KEY_SECRET=your_production_secret
RAZORPAYX_WEBHOOK_SECRET=your_webhook_secret
RAZORPAYX_BASE_URL=https://api.razorpay.com/v1

# Blockchain Configuration
RPC_URL=https://mainnet.infura.io/v3/your_project_id
PRIVATE_KEY=your_production_private_key
CONTRACT_ADDRESS=0x_deployed_contract_address

# Security
JWT_SECRET=your_jwt_secret_key
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring
LOG_LEVEL=info
MONITORING_ENDPOINT=https://monitoring.yourdomain.com/webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/your_webhook
```

### Frontend Environment Variables
```bash
# Next.js Production Environment
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
NEXT_PUBLIC_YELLOW_NETWORK_URL=wss://clearnet.yellow.com/ws
NEXT_PUBLIC_ENVIRONMENT=production

# Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## Docker Configuration

### Production Dockerfile for Backend
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S yellownet -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=yellownet:nodejs . .
USER yellownet
EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose Production
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  resolver-bot:
    build: ./resolver-bot
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "node", "health-check.js"]
      interval: 60s
      timeout: 15s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - frontend
      - backend
```

## Monitoring and Alerting

### Health Check Endpoints
- Backend: `GET /health` - Database, Yellow Network, RazorpayX status
- Resolver Bot: `GET /health` - Wallet connection, Yellow Network status
- Frontend: `GET /api/health` - API connectivity, performance metrics

### Monitoring Metrics
- Transaction success rate (target: >99.5%)
- Average processing time (target: <5s with Yellow Network)
- Yellow Network uptime (target: >99.9%)
- Error rates per endpoint (target: <0.1%)
- Memory and CPU usage
- Database connection pool status

### Alert Configuration
```javascript
const alerts = {
  criticalErrors: {
    threshold: 5, // errors per minute
    channels: ['slack', 'email', 'sms']
  },
  performanceDegradation: {
    threshold: 10000, // ms average response time
    channels: ['slack']
  },
  yellowNetworkDisconnection: {
    threshold: 30, // seconds offline
    channels: ['slack', 'email']
  },
  lowBalance: {
    threshold: 1000, // minimum balance in INR
    channels: ['email', 'sms']
  }
};
```

## Security Hardening

### Rate Limiting
```javascript
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
};
```

### Input Validation
```javascript
const orderValidation = {
  amount: {
    type: 'number',
    min: 1,
    max: 1000000, // 10 lakh INR maximum
    required: true
  },
  recipientUpi: {
    type: 'string',
    pattern: /^[\w.-]+@[\w.-]+$/,
    maxLength: 50,
    required: true
  },
  cryptoAmount: {
    type: 'string',
    pattern: /^\d+(\.\d{1,18})?$/,
    required: true
  }
};
```

### SSL/TLS Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

## Performance Optimization

### Database Indexing
```javascript
// MongoDB indexes for optimal performance
db.orders.createIndex({ "orderId": 1 }, { unique: true });
db.orders.createIndex({ "maker": 1, "createdAt": -1 });
db.orders.createIndex({ "status": 1, "createdAt": -1 });
db.orders.createIndex({ "recipientUpiAddress": 1 });
```

### Caching Strategy
```javascript
const cacheConfig = {
  orders: {
    ttl: 300, // 5 minutes
    maxSize: 1000
  },
  exchangeRates: {
    ttl: 60, // 1 minute
    maxSize: 10
  },
  userProfiles: {
    ttl: 1800, // 30 minutes
    maxSize: 500
  }
};
```

## Deployment Pipeline

### CI/CD Configuration (.github/workflows/deploy.yml)
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker build -t yellownet-backend ./backend
          docker build -t yellownet-frontend ./frontend
          docker build -t yellownet-resolver ./resolver-bot
          # Deploy to your production environment
```

## Backup and Recovery

### Database Backup
```bash
#!/bin/bash
# backup-script.sh
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backups/mongo_$DATE"
aws s3 sync "/backups/mongo_$DATE" s3://your-backup-bucket/mongo_$DATE
```

### Key Management
- Private keys stored in AWS Secrets Manager
- Regular key rotation (monthly)
- Multi-signature wallet setup for large amounts
- Hardware security module (HSM) for production keys

## Load Testing

### Performance Benchmarks
```javascript
const loadTest = {
  scenarios: [
    {
      name: 'Standard Load',
      rps: 10, // requests per second
      duration: '5m',
      expected_response_time: '<5s'
    },
    {
      name: 'Peak Load',  
      rps: 50,
      duration: '2m',
      expected_response_time: '<10s'
    },
    {
      name: 'Stress Test',
      rps: 100,
      duration: '1m',
      expected_error_rate: '<1%'
    }
  ]
};
```

## Compliance and Legal

### Data Privacy (GDPR/CCPA)
- User consent management
- Data encryption at rest and in transit
- Right to deletion implementation
- Data retention policies (2 years for financial records)

### Financial Compliance
- Transaction logging and audit trails
- AML (Anti-Money Laundering) checks
- KYC (Know Your Customer) integration
- Regulatory reporting capabilities

## Disaster Recovery

### RTO/RPO Targets
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour
- Database replication across multiple regions
- Automated failover procedures

### Business Continuity
- Yellow Network fallback to standard processing
- Multiple payment provider integration
- Geographic distribution of services
- 24/7 monitoring and on-call procedures

## Documentation and Training

### API Documentation
- OpenAPI/Swagger specifications
- Integration examples
- Error code references
- Rate limiting guidelines

### Operations Runbook
- Deployment procedures
- Incident response protocols
- Troubleshooting guides
- Performance tuning guidelines

This production readiness guide ensures the Yellow Network integration is enterprise-ready with proper security, monitoring, and operational procedures.