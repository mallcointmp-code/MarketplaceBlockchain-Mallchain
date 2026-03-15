# 🛒 The Market Place

[![Project Status: Active](https://img.shields.io/badge/Project%20Status-Active-brightgreen.svg)](https://github.com/lervez/The_Market_Place_1.0)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![pnpm](https://img.shields.io/badge/Maintained%20with-pnpm-ff69b4.svg)](https://pnpm.io/)

A state-of-the-art, premium Full-Stack Marketplace integrated with a Cosmos SDK Blockchain. This project features a robust advertising system, multi-step user registration, and real-time financial tracking.

---

## 🌟 Key Features

- **🛡️ Blockchain Integration**: On-chain vault management, transaction signing, and wallet synchronization.
- **📢 Advanced Advertising System**: CPI/CPC/CPM models with Redis-backed impression tracking and escrow-based budget management.
- **📝 Multi-Step Registration**: Tailored onboarding flows for Buyers, Sellers, and Delivery personnel.
- **💬 Review & Rating System**: Comprehensive feedback loop for products, shops, and jobs with moderation capabilities.
- **💰 Multi-Currency Wallet**: Support for MallMoney (KES), MallPoints (Premium), and MallCoins (Standard) with real-time conversion.
- **📊 Admin Dashboard**: Real-time analytics, content management, and financial oversight.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + Shadcn UI + Framer Motion
- **State Management**: Zustand
- **Real-time**: Socket.io-client

### Backend
- **Framework**: Node.js + Express
- **Database**: MongoDB (Mongoose) + Redis (ioredis)
- **Messaging**: Bull (Queue management)
- **Documentation**: Swagger/OpenAPI

### Blockchain
- **Core**: Cosmos SDK + Tendermint
- **CLI**: Ignite CLI
- **API**: Custom Express-based Blockchain Backend

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (>= 18)
- [pnpm](https://pnpm.io/) (>= 10)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [Ignite CLI](https://ignite.com/cli) (for blockchain development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/the-marketplace.git
   cd the-marketplace
   ```

2. **Install Ignite CLI** (Required for blockchain):
   ```bash
   curl https://get.ignite.com/cli! | bash
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Setup Environment Variables**:
   ```bash
   cp backend/.env.example backend/.env
   cp blockchain/backend/.env.example blockchain/backend/.env
   ```

---

## 🏃 Running the Application

### The Unified Workflow (Recommended)
Start all 5 services (Blockchain Node, Chain API, Backend, Workers, and Frontend) with one command:
```bash
pnpm run dev
```

### Alternative Start Commands
- **Marketplace Only**: `pnpm run dev:marketplace-only`
- **Individual Services**:
  - Backend: `pnpm --filter the-marketplace-backend run dev`
  - Frontend: `pnpm --filter frontend run dev`
  - Blockchain Node: `pnpm run dev:blockchain-node`

---

## 📂 Project Structure

```text
.
├── backend/            # Express API & Workers
├── blockchain/         # Cosmos SDK Blockchain & Chain Backend
├── frontend/           # React + Vite Frontend
├── scripts/            # Health check and utility scripts
├── package.json        # Monorepo configuration (pnpm)
└── README.md           # You are here!
```

---

## 📡 Ports Overview

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend** | `5173` | Marketplace Web UI |
| **Backend** | `5000` | Marketplace API |
| **Chain API** | `4000` | Blockchain Backend Gateway |
| **RPC** | `26657` | Blockchain Node RPC |
| **REST** | `1317` | Cosmos SDK REST API |

---

## 📜 Documentation

For more detailed information, please refer to:
- [Quick Start Guide](./QUICK_START.md)
- [Blockchain Integration](./BLOCKCHAIN_INTEGRATION.md)
- [Advertising Checklist](./ADVERTISING_CHECKLIST.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)

---

## 📄 License

This project is licensed under the **ISC License**.
