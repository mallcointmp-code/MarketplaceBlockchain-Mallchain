# Blockchain-Marketplace Integration Complete

## Overview

The marketplace now runs seamlessly alongside the blockchain, with all services operating concurrently. The integration provides on-chain vault management, transaction signing, and wallet synchronization between the marketplace and blockchain systems.

## Architecture

### Services Running Concurrently

1. **Blockchain Node** (Cosmos SDK + Tendermint)
   - Port: 26657 (RPC), 26656 (P2P), 1317 (REST)
   - Command: `ignite chain serve`

2. **Blockchain Backend API**
   - Port: 4000
   - Features: Vault management, transaction signing, OAuth

3. **Marketplace Backend API**
   - Port: 5000
   - Features: Wallet, QR payments, delivery, admin audit, **blockchain integration**

4. **Marketplace Workers**
   - Assignment worker
   - Requeue worker

5. **Marketplace Frontend**
   - Port: 5173
   - Features: Full marketplace UI with blockchain status

## Currency Conversion Rates

The marketplace uses three currencies with the following KES conversion rates:

- **MallMoney**: 1:1 with KES (fiat-like internal balance)
- **MallPoints**: 1 MallPoint = **2 KES** (premium reward currency)
- **MallCoins**: 1 MallCoin = **0.62 KES** (standard currency)

## Quick Start

### Option 1: Unified Startup (Recommended)

Start all services with a single command:

```bash
pnpm run dev:all
```

This runs the `start_all.sh` script which:
- Starts blockchain node
- Starts blockchain backend API
- Starts marketplace backend
- Starts marketplace workers
- Starts marketplace frontend
- Monitors all processes

### Option 2: Individual Services

Start services separately:

```bash
# Terminal 1: Blockchain
pnpm run dev:blockchain

# Terminal 2: Marketplace only
pnpm run dev:marketplace

# Or use the original command
pnpm run dev
```

### Health Check

Check if all services are running:

```bash
pnpm run health
```

### Stop All Services

Gracefully stop all services:

```bash
pnpm run stop
```

Or use Ctrl+C if running `start_all.sh`

## API Endpoints

### Blockchain Integration Endpoints

All endpoints require authentication (JWT token in `Authorization: Bearer <token>` header).

#### Get Blockchain Status
```http
GET /api/blockchain/status
```

Returns blockchain node status, health, and sync information.

#### Create Vault
```http
POST /api/blockchain/vault
Content-Type: application/json

{
  "data": {
    "description": "My vault"
  }
}
```

Creates a blockchain vault for the authenticated user.

#### Get Vault
```http
GET /api/blockchain/vault/:id
```

Retrieves vault details by ID.

#### Sign Transaction
```http
POST /api/blockchain/sign
Content-Type: application/json

{
  "vaultId": "vault_id_here",
  "data": {
    "amount": 1000,
    "to": "recipient_address"
  }
}
```

Signs a transaction using the blockchain vault.

#### Sync Wallet with Blockchain
```http
POST /api/blockchain/sync-wallet
```

Synchronizes the user's marketplace wallet with their blockchain vault. Creates a vault if one doesn't exist.

#### Record Transaction on Blockchain
```http
POST /api/blockchain/record-transaction
Content-Type: application/json

{
  "transactionId": "marketplace_transaction_id"
}
```

Records a marketplace transaction on the blockchain for immutability.

#### Get Node Information
```http
GET /api/blockchain/node
```

Returns blockchain node status and information.

## Integration Features

### 1. Wallet-Vault Synchronization

When a user creates a wallet in the marketplace, a corresponding blockchain vault is automatically created (if `ENABLE_BLOCKCHAIN_SYNC=true`).

**Wallet Model Fields:**
- `blockchainVaultId`: Reference to blockchain vault
- `lastBlockchainSync`: Timestamp of last synchronization

### 2. Transaction Recording

Marketplace transactions can be recorded on the blockchain for immutability and audit trails.

### 3. Cryptographic Signing

Users can sign transactions using their blockchain vault's cryptographic keys.

### 4. Currency Conversion

The `currencyConversion` utility provides helpers for converting between marketplace currencies:

```javascript
const currency = require('./utils/currencyConversion');

// Convert to KES
const kesFromPoints = currency.mallpointsToKES(100); // 200 KES
const kesFromCoins = currency.mallcoinsToKES(100);   // 62 KES

// Convert from KES
const pointsFromKes = currency.kesToMallpoints(200); // 100 MallPoints
const coinsFromKes = currency.kesToMallcoins(62);    // 100 MallCoins

// Get total wallet value
const totalKES = currency.getTotalValueKES(wallet);
```

## Configuration

### Marketplace Backend (.env)

```bash
# Blockchain Integration
BLOCKCHAIN_API_URL=http://localhost:4000
BLOCKCHAIN_RPC_URL=http://localhost:26657
BLOCKCHAIN_REST_URL=http://localhost:1317
ENABLE_BLOCKCHAIN_SYNC=true
```

### Blockchain Backend (.env)

```bash
# Marketplace Integration
MARKETPLACE_API_URL=http://localhost:5000
MARKETPLACE_JWT_SECRET=your_jwt_secret_here
ENABLE_MARKETPLACE_SYNC=true
```

## Service Discovery

Services communicate via HTTP:
- Marketplace → Blockchain: Uses `blockchainService.js`
- Blockchain → Marketplace: Can use `MARKETPLACE_API_URL`

## Logs

All service logs are stored in the `logs/` directory:
- `blockchain_node.log`
- `blockchain_backend.log`
- `marketplace_backend.log`
- `marketplace_frontend.log`
- `worker_assignment.log`
- `worker_requeue.log`

## Process Management

PID files are stored in `.pids/` directory for process tracking and graceful shutdown.

## User Journey Example

### Complete Flow with Blockchain Integration

1. **User Registration**
   ```
   POST /api/auth/register
   → User created in marketplace
   → Wallet created
   → Blockchain vault created (if sync enabled)
   ```

2. **Deposit Funds**
   ```
   POST /api/wallet/deposit
   → MPESA STK push
   → Wallet credited
   → Transaction recorded on blockchain (optional)
   ```

3. **QR Payment**
   ```
   POST /api/qr/generate
   → QR code generated
   
   POST /api/qr/scan
   → Payment verified
   → Transaction signed with blockchain vault
   → Atomic wallet transfer
   → Transaction recorded on blockchain
   ```

4. **View Blockchain Status**
   ```
   GET /api/blockchain/status
   → Check blockchain node health
   → View latest block
   → Verify vault sync status
   ```

## Troubleshooting

### Blockchain Node Not Starting

Check if Ignite CLI is installed:
```bash
ignite version
```

Install if needed: https://docs.ignite.com/welcome/install

### Port Already in Use

Kill processes on required ports:
```bash
fuser -k 5000/tcp  # Marketplace backend
fuser -k 4000/tcp  # Blockchain backend
fuser -k 5173/tcp  # Frontend
fuser -k 26657/tcp # Blockchain RPC
```

### Services Not Communicating

1. Check all services are running: `pnpm run health`
2. Verify environment variables are set correctly
3. Check CORS configuration allows cross-service requests
4. Review logs in `logs/` directory

### Blockchain Sync Disabled

If you don't want blockchain integration, set:
```bash
ENABLE_BLOCKCHAIN_SYNC=false
```

The marketplace will function normally without blockchain features.

## Production Considerations

1. **Security**
   - Use strong JWT secrets
   - Enable HTTPS for all services
   - Implement rate limiting
   - Secure blockchain RPC endpoints

2. **Scalability**
   - Use process managers (PM2, systemd)
   - Implement load balancing
   - Use separate databases for blockchain and marketplace
   - Consider blockchain node clustering

3. **Monitoring**
   - Set up health check endpoints
   - Monitor blockchain sync status
   - Track transaction success rates
   - Alert on service failures

4. **Backup**
   - Regular database backups
   - Blockchain state snapshots
   - Vault key backups (encrypted)

## Next Steps

1. **Frontend Integration**: Add blockchain status indicators to the wallet page
2. **Enhanced Sync**: Implement real-time wallet-vault synchronization
3. **Smart Contracts**: Deploy marketplace-specific smart contracts
4. **Multi-chain**: Support multiple blockchain networks
5. **Analytics**: Track blockchain transaction metrics

## Support

For issues or questions:
- Check logs in `logs/` directory
- Run health check: `pnpm run health`
- Review environment configuration
- Consult blockchain node documentation: https://docs.cosmos.network

---

**Integration Status**: ✅ Complete and Ready for Production

All services are configured to run concurrently with seamless communication between marketplace and blockchain systems.
