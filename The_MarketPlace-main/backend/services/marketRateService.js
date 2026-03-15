const axios = require('axios');
const cron = require('node-cron');

// In-memory cache for market rates
// Base is always KES in this ecosystem
let marketRates = {
    usd: 0.0078, // 1 KES = 0.0078 USD (Example)
    eur: 0.0072, // 1 KES = 0.0072 EUR (Example)
    gbp: 0.0062, // 1 KES = 0.0062 GBP (Example)
    lastUpdated: new Date()
};

/**
 * Fetch latest rates from an external provider
 * Note: Using a public API like exchangerate-api.com
 */
async function syncMarketRates() {
    try {
        console.log('[MarketRateService] Syncing rates from external provider...');
        // We use KES as the base to get conversion factors for others
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/KES');

        if (response.data && response.data.rates) {
            marketRates = {
                usd: response.data.rates.USD || marketRates.usd,
                eur: response.data.rates.EUR || marketRates.eur,
                gbp: response.data.rates.GBP || marketRates.gbp,
                lastUpdated: new Date()
            };
            console.log('[MarketRateService] Rates synchronized successfully.');
        }
    } catch (error) {
        console.error('[MarketRateService] Sync failed:', error.message);
        // Fallback to existing rates is already handled by the let variable
    }
}

// Schedule sync every 1 hour
cron.schedule('0 * * * *', () => {
    syncMarketRates();
});

// Initial sync on startup
syncMarketRates();

function getMarketRates() {
    return marketRates;
}

module.exports = {
    getMarketRates,
    syncMarketRates
};
