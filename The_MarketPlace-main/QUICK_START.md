# Quick Start Guide

## Installation

Install all dependencies across all workspaces:

```bash
pnpm install
```

This installs dependencies for:
- Marketplace backend
- Marketplace frontend  
- Blockchain backend

## Running Everything

Start all services (blockchain + marketplace) - **your familiar workflow**:

```bash
pnpm run dev
```

This starts **all 5 services**:
- ✅ Blockchain node (Cosmos SDK)
- ✅ Blockchain backend API (:4000)
- ✅ Marketplace backend (:5000)
- ✅ Marketplace workers (2)
- ✅ Marketplace frontend (:5173)

**Press Ctrl+C to stop all services**

## Alternative Commands

Run marketplace only (without blockchain):

```bash
pnpm run dev:marketplace-only
```

Check health of all services:

```bash
pnpm run health
```

## First Time Setup

1. **Install Ignite CLI** (required for blockchain):
   ```bash
   curl https://get.ignite.com/cli! | bash
   ```

2. **Copy environment files**:
   ```bash
   cp backend/.env.example backend/.env
   cp blockchain/backend/.env.example blockchain/backend/.env
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start everything**:
   ```bash
   pnpm run dev
   ```

## Ports Used

- **5173** - Marketplace Frontend
- **5000** - Marketplace Backend
- **4000** - Blockchain Backend
- **26657** - Blockchain RPC
- **26656** - Blockchain P2P
- **1317** - Blockchain REST API

## Troubleshooting

**Port already in use?**
```bash
pnpm run stop
```

**Services not starting?**
```bash
pnpm run health
```

**Need to reset blockchain?**
The blockchain automatically resets on each start with `--reset-once` flag.

---

For detailed documentation, see [BLOCKCHAIN_INTEGRATION.md](./BLOCKCHAIN_INTEGRATION.md)
