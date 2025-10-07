# Vulnerable NestJS Shop - Educational Security Assessment Platform

⚠️ **WARNING: THIS APPLICATION CONTAINS INTENTIONAL SECURITY VULNERABILITIES** ⚠️

**DO NOT USE IN PRODUCTION OR DEPLOY TO PUBLIC ENVIRONMENTS**

This application is designed exclusively for educational purposes and security assessment training.

## Overview

This is a deliberately vulnerable e-commerce application built with NestJS that demonstrates common security vulnerabilities from the OWASP Top 10 2021. It serves as a hands-on learning platform for:

- Security professionals and penetration testers
- Developers learning about application security
- Students studying cybersecurity
- Security awareness training

## Application Features

### Core Functionality
- User registration and authentication
- Product catalog with search functionality
- Shopping cart and order management
- Admin panel for user and product management
- File upload for product images
- Payment webhook processing
- System configuration endpoints

## Quick Start

### Prerequisites
- Node.js 18+ (application uses Node 16 in Docker for vulnerability demonstration)
- npm or yarn
- Docker and Docker Compose (optional)

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd vulnerable-nestjs
   npm install
   ```

2. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   ```

3. **Start Application**
   ```bash
   npm run start:dev
   ```

4. **Access Application**
   - API: http://localhost:3000
   - Swagger Documentation: http://localhost:3000/api

### Docker Setup (Recommended for Full Vulnerability Testing)

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

2. **Access Services**
   - Main Application: http://localhost:3000
   - Swagger API Docs: http://localhost:3000/api
   - File Server: http://localhost:8081
   - Database: localhost:5432
   - Redis: localhost:6379
   - SSH Access: localhost:22 (root/password123)

## Test Credentials

### Default Users (Weak Passwords)
- **Admin**: admin@shop.com / password123
- **User 1**: john@example.com / 123456
- **User 2**: jane@example.com / qwerty
- **Additional users**: password, 12345, admin, letmein, welcome

### System Access
- **SSH**: root / password123
- **Database**: admin / password123
- **Redis**: No password required
- **Webhook Secret**: webhook-secret-123
- **Config Secret**: config123
- **Export Secret**: export123


## License

This educational project is provided under the MIT License for learning purposes only.

## Contributions

This project is for educational purposes. If you have suggestions for additional vulnerabilities or improvements to the learning experience, please submit issues or pull requests.

---

**Remember: The goal is to learn secure development practices by understanding what NOT to do!**