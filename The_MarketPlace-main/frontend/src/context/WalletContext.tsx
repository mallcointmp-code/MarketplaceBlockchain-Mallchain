/**
 * Shared Wallet Context for Cross-Module Communication
 * Used by both Wallet and E-Commerce modules
 */

import React, { createContext, useState, useCallback } from 'react';

export const WalletContext = createContext<any>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState({
    address: null as string | null,
    publicKey: null as string | null,
    balance: 0,
    mallcoins: 0,
    mallpoints: 0,
    currency: 'KES',
    isConnected: false,
  });

  const [user, setUser] = useState({
    id: null,
    email: null,
    username: null,
    roles: [], // ['wallet', 'ecommerce', 'creator', etc]
  });

  // Connect wallet
  const connectWallet = useCallback(async (address: string, publicKey: string | null) => {
    setWalletState(prev => ({
      ...prev,
      address,
      publicKey,
      isConnected: true,
    }));
  }, []);

  // Update wallet balance from blockchain
  const updateBalance = useCallback(async (balance: number, mallcoins: number, mallpoints: number) => {
    setWalletState(prev => ({
      ...prev,
      balance,
      mallcoins,
      mallpoints,
    }));
  }, []);

  // Set user profile (shared across modules)
  const setUserProfile = useCallback((userData: any) => {
    setUser(userData);
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      address: null,
      publicKey: null,
      balance: 0,
      mallcoins: 0,
      mallpoints: 0,
      currency: 'KES',
      isConnected: false,
    });
  }, []);

  const value = {
    walletState,
    user,
    connectWallet,
    updateBalance,
    setUserProfile,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
