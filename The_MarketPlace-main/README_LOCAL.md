# Local Development Guide

This project is configured for a robust local development experience.

## Quick Start

1.  **Run the safe startup script**:
    ```bash
    ./start_dev.sh
    ```
    This will:
    - Kill any process on port 5000 (freeing the backend port).
    - Start the **Backend** (localhost:5000).
    - Start **Workers** (Assignment & Requeue).
    - Start the **Frontend** (localhost:5173).

2.  **Access the App**:
    - Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- **Port Safety**: The script automatically handles `EADDRINUSE` by clearing port 5000.
- **Blockchain Mocks**: If you don't have a local blockchain running, the backend automatically uses **Mock ABIs** and **Dummy Contracts**. You can still Register, Login, and use the Wallet (simulated).
- **Logging**: Detailed request/response logs are written to `backend_logs.txt` and the console. `auth/signup` and `auth/login` requests are clearly visible.
- **Proxy**: The frontend Vite server proxies all `/api/*` requests to `http://localhost:5000`.

## Troubleshooting

- **Logs**: Check `backend_logs.txt` for backend errors and `worker_*.txt` for worker status.
- **Database**: Ensure MongoDB is running (`mongod`). The app defaults to `mongodb://127.0.0.1:27017/marketplace` if `MONGO_URI` is not set.

## Manual Startup (Alternative)

If you prefer running terminals manually:

1.  **Backend**:
    ```bash
    cd backend
    npm start
    ```
2.  **Workers**:
    ```bash
    cd backend
    node workers/assignmentWorker.js
    node workers/requeueWorker.js
    ```
3.  **Frontend**:
    ```bash
    cd frontend
    npm run dev
    ```
