# Backend Services — Quick Guide

This file documents the recent backend services added/updated in this repo: ad escrow (adsService), OTP / 2FA flow, and related wallets/transactions. It also lists required environment variables and quick integration notes for production providers (MPESA, Twilio, SMTP, push).

## Features included
- Escrow & Ad charging
  - `backend/services/adsService.js` — functions: `reserveEscrow`, `releaseEscrow`, `chargeEscrow` (or `chargeAdEvent`) and `refundEscrow`.
  - Ledger entries: `backend/models/AdTransaction.js` and `backend/models/WalletTransaction.js` record immutable events.
  - Wallet reserves use the `reservedEscrow`/`reserved` field on `Wallet` to avoid double-spend.
  - Note: MongoDB transactions are used — you must run MongoDB as a replica set (single-node replset is fine) to support sessions.

- 2FA / OTP flow
  - `backend/services/otpService.js` — generates and stores OTPs (Redis preferred, DB fallback available via `Otp` model). Supports sending via email (nodemailer) or SMS (Twilio if configured).
  - `backend/controllers/otpController.js` and `backend/routes/otp.js` — endpoints: `POST /api/otp/request` and `POST /api/otp/verify` (authentication required).
  - `backend/middlewares/require2FA.js` — middleware that checks a short-lived Redis flag `2fa:<userId>` set after successful OTP verify; suitable for protecting sensitive endpoints (withdrawals, payouts).

## Important files & locations
- Models
  - `backend/models/AdTransaction.js`
  - `backend/models/Wallet.js` (wallet balance + reserved fields)
  - `backend/models/WalletTransaction.js`
  - `backend/models/Otp.js` (DB fallback storage for OTPs)

- Services / Controllers
  - `backend/services/adsService.js`
  - `backend/services/otpService.js`
  - `backend/controllers/adsController.js` (admin approve/reject added)
  - `backend/controllers/otpController.js`
  - `backend/routes/ads.js` (admin routes added)
  - `backend/routes/otp.js`

## Environment variables (important)
Set these in your `.env` or environment for production:

- MongoDB / Redis
  - `MONGO_URI` — MongoDB connection string (replica set recommended for transactions)
  - `REDIS_URL` — Redis connection (used for OTP storage and 2FA short-lived flags)

- OTP / Email
  - `OTP_TTL` — OTP lifetime in seconds (default 300)
  - `TWOFA_WINDOW` — 2FA post-verify window (seconds), default 300
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — for nodemailer

- SMS (Twilio)
  - `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` — if using Twilio

- Payments / Payouts
  - MPESA / Stripe / other provider keys are not included here. The repository intentionally removed simulation code for payouts — you must implement provider logic in `backend/services/mpesaService.js` or `backend/services/paymentService.js`.

## Integration notes

- MPESA (Daraja / STK)
  - Implement OAuth to obtain access token and call STK push endpoints. Add logic in `backend/services/mpesaService.js`.
  - Implement webhook callback verification and idempotency. Use the `confirmStkCallback` pattern in `backend/controllers/walletController.js` to credit wallets inside a MongoDB transaction when payment completes.

- Payouts
  - Implement vendor payout flows in `mpesaPayout` (or your chosen provider). Withdraw endpoints currently create ledger entries but will return `501` until a payout provider is integrated.

- Twilio / SMS
  - `backend/services/otpService.js` supports sending via Twilio when configured. If Twilio is not configured, OTPs are sent via email or logged (depending on implementation). Configure Twilio env vars to enable real SMS delivery.

- Nodemailer / Email
  - Configure SMTP env vars to enable email delivery for OTPs and notifications.

## Developer / Test steps
1. Ensure MongoDB and Redis are running and env vars `MONGO_URI` and `REDIS_URL` are set.
2. Install dependencies if needed:
   ```powershell
   cd "D:\The_Market_Place 1.0\backend"
   npm install
   ```
3. Start the server:
   ```powershell
   node app.js
   ```
4. Test OTP flow:
   - Authenticate as a user and call `POST /api/otp/request` (body: `{ "via":"sms" }` or omit to auto-select).
   - Read OTP from SMS/email (or DB `Otp` collection if using DB fallback).
   - Call `POST /api/otp/verify` with `{ "code": "123456" }` to verify; this sets `2fa:<userId>` in Redis for a short window.

## Notes / Caveats
- Transactions: many service methods use MongoDB sessions. This requires a replica set.
- Simulation removal: the repository removed simulation code to avoid accidental reliance on fake providers. You must plug in real provider logic for production flows.
- Security: production OTP flows should be rate-limited and monitored for abuse. Consider adding per-user and per-IP throttles.

If you want, I can scaffold a sandbox MPESA Daraja implementation or add example provider skeletons in `backend/services/` (requires your preference and any sandbox credentials).
