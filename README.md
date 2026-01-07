# Melodies Merch Store - Backend API

This repository contains the backend source code for the **Melodies Merch Store**, an e-commerce platform designed for selling physical music (like vinyls, CDs) and official artist merchandise.

Built with a modern and scalable architecture, this robust backend provides a comprehensive set of APIs to support a full-featured frontend application. It includes everything from product and inventory management to secure order processing, along with a powerful admin panel for complete control over the store's operations.

The live API is deployed and accessible at: **[melodies.studio/api](https://melodies.studio/api)**

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
- **Type-Safe Database Access:** Uses **Prisma** as a next-generation ORM for cleaner, more reliable database interactions.
- **Efficient Session Management:** Leverages **Redis** for high-performance session and key management.
- **Mail Service:** Handles transactional emails using SMTP configuration.
- **API Documentation:** Includes an `openapi.yaml` file for automatic **Swagger UI** generation, making API exploration and integration seamless.
- **Containerized & Deployment-Ready:** Comes with a `Dockerfile` and `docker-compose.yml` for easy, consistent, and reproducible deployments.
- **Optimized for Production:** Includes an **Nginx** configuration, ready to be used as a reverse proxy for enhanced performance and security.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js
- Docker and Docker Compose

### Installation & Running Locally

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/marcomoi395/melodies-merch-store.git
    cd melodies-merch-store
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

3.  **Set up your environment variables:**
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

    # Redis Configuration
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_DB=0

    # Mail Configuration (SMTP)
    MAIL_USER=your_email@example.com
    MAIL_PASS=your_email_password
    MAIL_FROM="Melodies Store <no-reply@melodies.studio>"
    ```

4.  **Running Locally (Development Mode)**
    Make sure your local PostgreSQL and Redis services are running.
    **Run Database Migrations:** Push the schema to your database and generate the Prisma Client:

    ```bash
    npx prisma migrate dev
    ```

    **Seed Initial Data:** Populate the database with essential data (e.g., Super Admin account, Categories):

    ```bash
    npx prisma db seed
    ```

    **Start the Server:**

    ```bash
    npm run start:dev
    ```

    The application will be available at `http://localhost:3000`.

5.  **Deployment (Production)**
    This project is configured to be deployed using Docker Compose, which includes the API, Database, Redis, and an Nginx reverse proxy with SSL support.

    **Note:** The provided `docker-compose.yml` assumes you have SSL certificates mapped (e.g., via Let's Encrypt).

    **Build and Run:**

    ```bash
    docker-compose up -d
    ```

    **Check Containers:**

    ```bash
    docker-compose ps
    ```

## API Documentation

Once the application is running, you can access the interactive Swagger UI to view all available endpoints, test them, and see the request/response models.

- **Live Demo:** [https://melodies.studio/api](https://melodies.studio/api)

- **Local Development:** [http://localhost:3000/api](https://www.google.com/search?q=http://localhost:3000/api&authuser=1)

This documentation is automatically generated from the `openapi.yaml` file.
