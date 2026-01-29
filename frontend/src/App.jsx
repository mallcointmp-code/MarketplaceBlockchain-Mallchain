import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Gateway from "./pages/Gateway";
import CreateWallet from "./pages/CreateWallet";
import RestoreWallet from "./pages/RestoreWallet";
import Confirm from "./pages/Confirm";
import Dashboard from "./pages/Dashboard";
import Wallet from "./pages/Wallet";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gateway />} />
        <Route path="/create" element={<CreateWallet />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/restore" element={<RestoreWallet />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
