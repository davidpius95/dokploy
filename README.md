# Dokploy - Self-Hosted Platform as a Service

<div align="center">
  <img src=".github/sponsors/logo.png" alt="Dokploy - Open Source Alternative to Vercel, Heroku and Netlify." width="100%"  />
  </br>
  </br>
  <p>Self-hosted Platform as a Service (PaaS) for deploying applications and managing databases</p>
</div>

## 🚀 Quick Start

This README documents the setup and configuration of Dokploy on your local development environment.

### Prerequisites

- **Node.js**: ^20.16.0
- **pnpm**: >=9.12.0
- **Docker**: For running Redis and PostgreSQL
- **Linux/Unix**: Tested on Ubuntu/Debian systems

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd dokploy
   pnpm install
   ```

2. **Start Required Services**
   ```bash
   # Start Redis
   docker run -d --name dokploy-redis -p 6379:6379 redis:7-alpine
   
   # Start PostgreSQL
   docker run -d --name dokploy-postgres \
     -e POSTGRES_USER=dokploy \
     -e POSTGRES_PASSWORD=amukds4wi9001583845717ad2 \
     -e POSTGRES_DB=dokploy \
     -p 5432:5432 postgres:15
   ```

3. **Run the Application**
   ```bash
   DATABASE_URL=postgres://dokploy:amukds4wi9001583845717ad2@localhost:5432/dokploy \
   NODE_ENV=development \
   PORT=3000 \
   HOST=0.0.0.0 \
   IS_CLOUD=false \
   PUBLIC_APP_URL=http://localhost:3000 \
   STRIPE_ENABLED=false \
   pnpm run dokploy:dev
   ```

4. **Access the Application**
   - Open your browser and navigate to: **http://localhost:3000**
   - Login with your admin credentials

## 🔐 Authentication

### Admin Account

- **Email**: `johnsdanlami@gmail.com`
- **Role**: Owner (Full admin privileges)
- **Organization**: "My Organization"

### First-Time Setup

If you need to create a new admin account:

1. **Register the first user** through the web interface
2. **Update user status** in the database:
   ```sql
   UPDATE user_temp 
   SET "isRegistered" = true, email_verified = true 
   WHERE email = 'your-email@example.com';
   ```

## 🗄️ Database Schema

### Core Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `user_temp` | User accounts and profiles | 1 |
| `organization` | Organizations/workspaces | 1 |
| `member` | User memberships and roles | 1 |
| `server` | Server configurations | 1 |
| `ssh-key` | SSH key management | 1 |

### Current Data Summary

- **Users**: 1 (admin account)
- **Organizations**: 1 ("My Organization")
- **Projects**: 0 (none created yet)
- **Applications**: 0 (none deployed yet)
- **Servers**: 1 (example server configured)

## 🖥️ Server Management

### Adding Servers

Dokploy supports multiple servers for deploying applications and databases.

#### Prerequisites

1. **SSH Key Pair**: Required for secure server access
2. **Server Access**: IP address, port, username
3. **Docker**: Must be installed on target servers

#### SSH Key Setup

1. **Generate SSH Key Pair**:
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/dokploy_key -N ""
   ```

2. **Add Public Key to Server**:
   ```bash
   # On your target server
   echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDL8+DCyq0JzQmrLFr4fCjX9h2ZEKeBz8fAYh6TcS34uY1iuXM8RIgzpLfNkGvoNYtIuNwjhNn4MUODH97qV8E9dZXA5QT5zwLK3v/kfjfgUKALN62XMSSEF6EllbQxmn65SXn5I0RicanFWKt2z4+HR4kNz1hoMxag+S784g+rke7JCCfuHPR3GtYbNPH7Y9ZieYJiRy6U/O18FaUZvRb6kSVlgUP3L1KFjLZ6SeHiRk0A2/1zrAGtdHhiZgm8febnbMyNJ/knfhhBzAeTCZ0BNrC3bG42LiMx1GNGR8x2tjjruTifOeT7Si798sw8RdceoNIOkR2kjp5oWJY5PuAsuuHLhZ3AvnkB6yXcF6dx/TU9MfB16bE2feMVe2JJnwDWmuaRvhl4i74PZD1sD4L/URBFlqfJ1u5IoFAwYJvqflyZH65eSyyRgnl80uTHDXNkJw8dtLBmUixha0AkbJazMtKbwvB5M8ukQvQfJVFNUgoza2F0VwWSx06nmizq7J9ktHw0+woalEBii98pT+j14QMWIKKbIbQkQ8WThfWSLra1SEVfgpfpXAWpGylxanjMx4BCvphtJhYqV4AoIr8bnZ6bcZy+El3pXOkB0HDPmz8wB8q/fYWQ76Bda1Hff0ErJyLC9JCOGodAJCL5z3learIayZwfC4A2HDHj98epcQ== john-danlami@john-danlami-ThinkPad-X1-Carbon-7th" >> ~/.ssh/authorized_keys
   ```

#### Adding Server via Web Interface

1. **Navigate to**: Settings → Servers
2. **Click**: "Add Server"
3. **Fill in details**:
   - **Name**: Server name (e.g., "Production Server")
   - **Description**: Optional description
   - **IP Address**: Server IP address
   - **Port**: SSH port (usually 22)
   - **Username**: SSH username (usually root)
   - **SSH Key**: Select "Dokploy Server Key"

#### Adding Server via Database

```sql
INSERT INTO server (
    "serverId", 
    name, 
    description, 
    "ipAddress", 
    port, 
    username, 
    "appName", 
    "enableDockerCleanup", 
    "createdAt", 
    "sshKeyId", 
    "serverStatus", 
    command, 
    "metricsConfig", 
    "organizationId"
) VALUES (
    gen_random_uuid(),
    'Your Server Name',
    'Your server description',
    'YOUR_SERVER_IP',
    22,
    'root',
    'your-server-app',
    false,
    NOW(),
    '3650a075-85d0-4f64-808c-6fae240286bf', -- SSH Key ID
    'active',
    '',
    '{"server":{"type":"Remote","refreshRate":60,"port":4500,"token":"","urlCallback":"","cronJob":"","retentionDays":2,"thresholds":{"cpu":0,"memory":0}},"containers":{"refreshRate":60,"services":{"include":[],"exclude":[]}}}',
    'NR_EBxF1R2TbieVBCau1o' -- Organization ID
);
```

## 🛠️ Features

### Applications
- Deploy any type of application (Node.js, PHP, Python, Go, Ruby, etc.)
- Automatic containerization with Docker
- Environment variable management
- Custom domains and SSL certificates
- Auto-scaling capabilities

### Databases
- **MySQL**: Relational database management
- **PostgreSQL**: Advanced relational database
- **MongoDB**: NoSQL document database
- **Redis**: In-memory data structure store
- **MariaDB**: MySQL alternative

### Infrastructure
- **Docker Compose**: Native support for complex applications
- **Multi-Node**: Scale applications using Docker Swarm
- **Traefik Integration**: Automatic load balancing and routing
- **Real-time Monitoring**: CPU, memory, storage, and network usage

### Security
- **SSH Key Management**: Secure server access
- **Role-based Access Control**: User permissions and roles
- **Two-Factor Authentication**: Enhanced security
- **API Key Management**: Programmatic access

## 📊 Monitoring & Management

### Real-time Monitoring
- Server resource usage (CPU, Memory, Disk, Network)
- Container statistics
- Application performance metrics
- Custom alerting and notifications

### Backup & Recovery
- Automated database backups
- Volume backup management
- Scheduled backup jobs
- One-click restore functionality

### Notifications
- **Email**: SMTP integration
- **Slack**: Webhook notifications
- **Discord**: Channel notifications
- **Telegram**: Bot notifications
- **Gotify**: Push notifications

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NODE_ENV` | Environment mode | Yes | development |
| `PORT` | HTTP port | No | 3000 |
| `HOST` | Server bind address | No | 0.0.0.0 |
| `IS_CLOUD` | Multi-tenant mode | Yes | false |
| `PUBLIC_APP_URL` | Public base URL | Yes | http://localhost:3000 |
| `STRIPE_ENABLED` | Enable billing | No | true |

### Database Configuration

- **Host**: localhost:5432
- **Database**: dokploy
- **Username**: dokploy
- **Password**: amukds4wi9001583845717ad2

### Redis Configuration

- **Host**: localhost:6379
- **Port**: 6379
- **Container**: dokploy-redis

## 🚀 Deployment

### Local Development

```bash
# Start services
docker start dokploy-redis dokploy-postgres

# Run application
pnpm run dokploy:dev
```

### Production Deployment

1. **Set up production environment variables**
2. **Configure SSL certificates**
3. **Set up monitoring and backups**
4. **Deploy using Docker or traditional hosting**

## 📝 API Documentation

Dokploy provides a comprehensive API for programmatic access:

- **REST API**: Standard HTTP endpoints
- **tRPC**: Type-safe API with automatic documentation
- **WebSocket**: Real-time communication
- **CLI**: Command-line interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the Apache-2.0 License.

## 🆘 Support

- **Documentation**: [docs.dokploy.com](https://docs.dokploy.com)
- **Discord**: [Join our community](https://discord.gg/2tBnJ3jDJc)
- **Issues**: [GitHub Issues](https://github.com/dokploy/dokploy/issues)

## 🔄 Updates

To update Dokploy:

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Update dependencies**:
   ```bash
   pnpm install
   ```

3. **Run migrations**:
   ```bash
   pnpm run migration:run
   ```

4. **Restart the application**:
   ```bash
   pnpm run dokploy:dev
   ```

---

**Dokploy** - Simplifying deployment and infrastructure management since 2024.
