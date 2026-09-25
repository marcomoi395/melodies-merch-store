# Melodies Merch Store - Backend API

This repository contains the backend source code for the **Melodies Merch Store**, an e-commerce platform designed for selling physical music (like vinyls, CDs) and official artist merchandise.

**Production URL:** [https://shop.banecon.site/api](https://shop.banecon.site/api)

Built with a modern and scalable architecture, this robust backend provides a comprehensive set of APIs to support a full-featured frontend application. It includes everything from product and inventory management to secure order processing, along with a powerful admin panel for complete control over the store's operations.

## Key Features

This backend is packed with features to ensure a smooth experience for both customers and administrators.

### E-Commerce Functionality

- **Product Catalog:** Full CRUD operations for products, including detailed descriptions, pricing, and images.
- **Artist & Genre Management:** Organize products by artists and musical genres.
- **Order Management:** A complete workflow for handling customer orders from placement to fulfillment.
- **Discount Codes:** Create and manage promotional codes to drive sales.

### Admin & System Control

- **Powerful Admin Panel:** A dedicated set of endpoints for administrators to manage the entire platform.
- **User & Staff Management:** Control over different user accounts, including staff and administrators.
- **Role-Based Access Control (RBAC):** Secure endpoints with a granular permission system to ensure users can only access what they're authorized to.

### Technical Highlights

- **Scalable Architecture:** Built with **NestJS**, a progressive Node.js framework for building efficient and scalable server-side applications.
- **Database Access:** Uses **TypeORM** with PostgreSQL migrations and explicit entity mappings.
- **Efficient Session Management:** Leverages **Redis** for high-performance session and key management.
- **Mail Service:** Handles transactional emails using SMTP configuration.
- **API Documentation:** Optionally serves generated Swagger metadata when `SWAGGER_ENABLED=true`, alongside a Postman Collection for quick testing and exploration of the Melodies Merch Platform APIs.
- **Containerized & Deployment-Ready:** Comes with a `Dockerfile` and `docker-compose.yml` for easy, consistent, and reproducible deployments.
- **Optimized for Production:** Includes an **Nginx** configuration, ready to be used as a reverse proxy for enhanced performance and security.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js
- Docker and Docker Compose

### Installation & Running Locally

1. **Clone the repository:**

    ```sh
    git clone https://github.com/marcomoi395/melodies-merch-store.git
    cd melodies-merch-store
    ```

2. **Install dependencies:**

    ```sh
    npm install
    ```

3. **Set up your environment variables:**
   Create a `.env` file in the root directory. You can use the template below:

    ```
    # Database Configuration
    DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
    POSTGRES_USER=user
    POSTGRES_PASSWORD=password
    POSTGRES_DB=mydb

    # Security & Authentication
    BCRYPT_SALT_ROUNDS=10
    JWT_SECRET=your_super_secret_jwt_key

    # Application boundaries
    API_URL=http://localhost:3000
    CUSTOMER_APP_URL=http://localhost:3001
    CORS_ORIGINS=http://localhost:3001
    SWAGGER_ENABLED=false

    # Redis Configuration
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=password
    REDIS_DB=0

    # Mail Configuration (SMTP)
    MAIL_USER=your_email@example.com
    MAIL_PASS=your_email_password
    MAIL_FROM="Melodies Store <no-reply@melodies.studio>"
    ```

4. **Running Locally (Development Mode)**
   Make sure your local PostgreSQL and Redis services are running. For a new database, run the TypeORM migration before seeding or starting the application:

    ```bash
    npm run migration:run
    ```

    **Seed Initial Data:** Populate the idempotent base data (Super Admin, permissions, catalog, carts, and sample orders):

    ```bash
    npm run seed
    ```

    **Start the Server:**

    ```bash
    npm run start:dev
    ```

    The application will be available at `http://localhost:3000`.

    Existing databases must pass the TypeORM adoption preflight and be fake-baselined before `migration:run`. See [the cutover runbook](tasks/typeorm-cutover.md).

5. **Local dependencies**
   `docker-compose.local.yml` currently starts PostgreSQL on port `5432` and Redis on port `6380`. Start the API locally with `npm run start:dev`; its API and Nginx service definitions are intentionally commented out.

    **Build and Run:**

    ```bash
    docker compose -f docker-compose.local.yml up -d
    ```

    **Check Containers:**

    ```bash
    docker-compose ps
    ```

## Database Operations

- `npm run migration:run` applies pending TypeORM migrations.
- `npm run migration:revert` reverts only the latest TypeORM migration; never use it on a shared deployed database during an application rollback.
- `npm run migration:adopt` fake-baselines an existing matching schema after preflight; it does not create, drop, or alter application tables.
- `npm run seed` synchronizes the documented base data. It is repeatable and does not clear the database.
- `npm run test:database` runs disposable PostgreSQL migration and adoption coverage when `TEST_DATABASE_URL` is configured.

## VPS deployment

The production compose file pulls the published backend and frontend images from Docker Hub. On the VPS, copy `.env.example` to `.env`, replace all placeholder secrets, then run:

```sh
docker compose pull
docker compose up -d
```

Nginx serves the storefront on `127.0.0.1:8081` and proxies `/api` to the backend. A host reverse proxy should terminate HTTPS and forward `shop.banecon.site` to that address. With Caddy:

```caddy
shop.banecon.site {
    reverse_proxy 127.0.0.1:8081
}
```
