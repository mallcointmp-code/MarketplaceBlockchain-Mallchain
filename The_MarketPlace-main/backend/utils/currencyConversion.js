// Currency conversion rates for marketplace
// These rates define the value of marketplace currencies in KES

module.exports = {
    // 1 MallPoint = 2 KES (premium reward currency)
    MALLPOINT_TO_KES: 2.0,

    // 1 MallCoin = 0.62 KES (standard currency)
    MALLCOIN_TO_KES: 0.62,

    // Base currency
    BASE_CURRENCY: 'KES',

    /**
     * Convert MallPoints to KES
     * @param {number} mallpoints - Amount in MallPoints
     * @returns {number} Amount in KES
     */
    mallpointsToKES(mallpoints) {
        return mallpoints * this.MALLPOINT_TO_KES;
    },

    /**
     * Convert MallCoins to KES
     * @param {number} mallcoins - Amount in MallCoins
     * @returns {number} Amount in KES
     */
    mallcoinsToKES(mallcoins) {
        return mallcoins * this.MALLCOIN_TO_KES;
    },

    /**
     * Convert KES to MallPoints
     * @param {number} kes - Amount in KES
     * @returns {number} Amount in MallPoints
     */
    kesToMallpoints(kes) {
        return kes / this.MALLPOINT_TO_KES;
    },

    /**
     * Convert KES to MallCoins
     * @param {number} kes - Amount in KES
     * @returns {number} Amount in MallCoins
     */
    kesToMallcoins(kes) {
        return kes / this.MALLCOIN_TO_KES;
    },

    /**
     * Get total wallet value in KES
     * @param {object} wallet - Wallet object with mallmoney, mallcoins, mallpoints
     * @returns {number} Total value in KES
     */
    getTotalValueKES(wallet) {
        const mallmoneyKES = wallet.mallmoney || 0;
        const mallcoinsKES = this.mallcoinsToKES(wallet.mallcoins || 0);
        const mallpointsKES = this.mallpointsToKES(wallet.mallpoints || 0);

        return mallmoneyKES + mallcoinsKES + mallpointsKES;
    }
};
