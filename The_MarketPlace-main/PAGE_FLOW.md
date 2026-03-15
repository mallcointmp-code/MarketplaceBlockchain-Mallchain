# The Market Place - Complete Page Flow

## Architecture Overview

The application is fully wired with the following page flow:

### 1. Authentication Flow
- **Login/Register** → User selects role (buyer/seller/delivery/admin)
- On registration, if role is `delivery`, a `DeliveryAgent` record is automatically created
- JWT token stored in localStorage
- User is redirected to appropriate dashboard based on role

### 2. Wallet Flow (All Users)
```
/wallet → Wallet Dashboard (view balance, transactions)
  ↓
/wallet/deposit → Deposit funds via MPESA
  ↓
/wallet/withdraw → Withdraw to MPESA (uses B2C worker with refund on failure)
  ↓
/wallet/send → Send money to another user
  ↓
/wallet/set-pin → Set/update withdrawal PIN
```

### 3. QR Payment Flow
```
Receiver: /qr/generate → Generate QR code with amount
  ↓
Sender: /qr/scan → Scan QR code
  ↓
System validates QR, checks if OTP required (large amounts)
  ↓
/api/otp/request → Send OTP if needed
  ↓
Confirm payment → Wallet transfer executed atomically
  ↓
/api/receipt/:txId → Download PDF receipt
```

### 4. Delivery Agent Flow
```
Agent login → DeliveryAgent record created/updated
  ↓
/delivery → View available tasks
  ↓
/delivery/task/:taskId → Accept task
  ↓
Socket.IO: agent:location → Real-time location updates
  ↓
/delivery/pickup/:taskId → Confirm pickup
  ↓
/delivery/dropoff/:taskId → Confirm delivery
  ↓
/delivery/earnings → View earnings and payout history
```

### 5. Admin Flow
```
/admin/audit → View all wallet transactions
  ↓
Filter by user, type, date
  ↓
Download CSV export
  ↓
Monitor delivery agents (via Socket.IO admin:delivery room)
```

## Backend Route Wiring

All routes are mounted in `backend/app.js`:

- `/api/auth` → Login, register, role selection
- `/api/wallet` → Deposit, withdraw, send, escrow operations
- `/api/qr` → Generate QR, verify and pay
- `/api/otp` → Request OTP, verify OTP
- `/api/receipt` → Download PDF receipts
- `/api/delivery` → Task management, agent location
- `/api/admin/audit` → Transaction audit endpoints
- `/api/mpesa` → MPESA callbacks (STK, B2C)

## Frontend Route Wiring

All pages wired in `frontend/public/src/router/`:

### UserRoutes.jsx
- Wallet pages: `/wallet`, `/wallet/deposit`, `/wallet/withdraw`, `/wallet/send`
- QR pages: `/qr/generate`, `/qr/scan`
- Delivery pages: `/delivery`, `/delivery/task/:taskId`, `/delivery/earnings`
- Admin: `/admin/audit`

### Navigation Component
- Sticky top navigation with role-based links
- Shows wallet, QR, delivery (if agent), admin (if admin) links
- Logout button clears localStorage and redirects to login

## Key Integrations

### 1. Socket.IO (Real-time)
- Agent location broadcasts: `agent:location` event
- Task updates: `task:update` event
- Admin monitoring: `admin:delivery` room
- User notifications: `user:<userId>` rooms

### 2. Bull Queue (Background Jobs)
- B2C payout worker: `backend/workers/b2cWorker.js`
- Automatic refund on permanent failure
- Retry with exponential backoff

### 3. MongoDB Transactions
- Atomic wallet transfers
- Ledger-first architecture (immutable WalletTransaction records)
- Fallback to non-transactional when replica set unavailable

### 4. OTP/2FA
- Redis-backed OTP storage (5min TTL)
- SMS via Twilio (stub fallback when not configured)
- Email via SendGrid (stub fallback when not configured)
- Required for large QR payments (configurable threshold)

## Environment Variables Required

```env
# Database
MONGO_URI=mongodb://127.0.0.1:27017/the_market_place
REDIS_URL=redis://127.0.0.1:6379

# Auth
JWT_SECRET=your_jwt_secret_here

# MPESA
MPESA_B2C_API_URL=https://sandbox.safaricom.co.ke/...
MPESA_B2C_CONSUMER_KEY=...
MPESA_B2C_CONSUMER_SECRET=...
MPESA_B2C_INITIATOR=...
MPESA_B2C_SECURITY_CREDENTIAL=...
MPESA_B2C_SHORTCODE=...

# Notifications
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=+1234567890
SENDGRID_API_KEY=...
EMAIL_FROM=no-reply@themarketplace.example

# App
PORT=3000
BACKEND_URL=http://localhost:3000
FRONTEND_BASE=http://localhost:5173
```

## Running the Application

### Backend
```bash
cd backend
npm install
node app.js
```

### B2C Worker (separate terminal)
```bash
cd backend
node workers/b2cWorker.js
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Page Flow Diagram

```
                    Login/Register
                          ↓
              ┌───────────┴───────────┐
              ↓                       ↓
         User Role               Delivery Role
              ↓                       ↓
    ┌─────────┴─────────┐      Delivery Dashboard
    ↓                   ↓             ↓
Wallet Dashboard    QR Payment   Accept Tasks
    ↓                   ↓             ↓
├─ Deposit         Generate QR   Pickup Confirm
├─ Withdraw        Scan & Pay        ↓
├─ Send/Receive         ↓        Delivery Confirm
└─ Set PIN         Receipt PDF       ↓
                                 View Earnings
                   
                   Admin Role
                       ↓
                  Audit Dashboard
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
      View Transactions    Monitor Agents
              ↓                 ↓
        Download CSV      Real-time Tracking
```

## Production Checklist

- [ ] Set all environment variables
- [ ] Configure MongoDB replica set for transactions
- [ ] Set up Redis with persistence
- [ ] Configure MPESA production credentials
- [ ] Set up Twilio/SendGrid accounts
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS properly
- [ ] Set up monitoring (Prometheus metrics on `/metrics`)
- [ ] Start B2C worker as systemd service
- [ ] Set up backup strategy for MongoDB
- [ ] Configure log rotation
