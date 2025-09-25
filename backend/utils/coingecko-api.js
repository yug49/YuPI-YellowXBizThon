const axios = require("axios");

/**
 * CoinGecko API Integration for Real-time Pricing
 * Used for instant order fulfillment without Dutch auction
 */
class CoinGeckoAPI {
    constructor() {
        this.baseURL = "https://api.coingecko.com/api/v3";
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache

        // Token ID mapping for CoinGecko
        this.tokenMapping = {
            USDC: "usd-coin",
            USDT: "tether",
            WETH: "weth",
            ETH: "ethereum",
            WBTC: "wrapped-bitcoin",
            DAI: "dai",
            MATIC: "matic-network",
            BNB: "binancecoin",
        };
    }

    /**
     * Get real-time price for token in INR
     * @param {string} tokenSymbol - Token symbol (e.g., 'USDC', 'ETH')
     * @returns {Promise<number>} Price in INR
     */
    async getTokenPriceINR(tokenSymbol) {
        try {
            const cacheKey = `${tokenSymbol}_INR`;
            const cached = this.cache.get(cacheKey);

            // Return cached price if valid
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(
                    `💰 Using cached price for ${tokenSymbol}: ₹${cached.price}`
                );
                return cached.price;
            }

            const tokenId = this.tokenMapping[tokenSymbol.toUpperCase()];
            if (!tokenId) {
                throw new Error(`Token ${tokenSymbol} not supported`);
            }

            console.log(
                `🔍 Fetching live price for ${tokenSymbol} from CoinGecko...`
            );

            // Use the exact CoinGecko API format provided
            const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=inr`;
            console.log(`🌐 API URL: ${apiUrl}`);

            const response = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    Accept: "application/json",
                    "User-Agent": "YuPI-Backend/1.0",
                },
            });

            console.log(`📊 CoinGecko response:`, response.data);

            // Extract price using the exact format: response.data[tokenId].inr
            const price = response.data[tokenId]?.inr;
            if (!price) {
                throw new Error(
                    `Price not found for ${tokenSymbol} in response: ${JSON.stringify(
                        response.data
                    )}`
                );
            }

            // Cache the price
            this.cache.set(cacheKey, {
                price,
                timestamp: Date.now(),
            });

            console.log(`💰 Live price for ${tokenSymbol}: ₹${price}`);
            return price;
        } catch (error) {
            console.error(
                `❌ Failed to fetch price for ${tokenSymbol}:`,
                error.message
            );

            // Return fallback prices if API fails
            const fallbackPrices = {
                USDC: 88.76, // Based on example response
                USDT: 88.5,
                ETH: 220000, // ~$2600 = ₹220k
                WETH: 220000,
                WBTC: 5800000, // ~$70k = ₹58L
                DAI: 88.5,
                MATIC: 70, // Current MATIC price
                BNB: 43000, // Current BNB price
            };

            const fallbackPrice =
                fallbackPrices[tokenSymbol.toUpperCase()] || 88.76;
            console.log(
                `⚠️ Using fallback price for ${tokenSymbol}: ₹${fallbackPrice}`
            );
            return fallbackPrice;
        }
    }

    /**
     * Calculate UPI amount for token trade
     * @param {string} tokenSymbol - Token to sell
     * @param {number} tokenAmount - Amount of tokens
     * @returns {Promise<Object>} Calculation result
     */
    async calculateUPIAmount(tokenSymbol, tokenAmount) {
        try {
            const pricePerToken = await this.getTokenPriceINR(tokenSymbol);
            const totalINR = pricePerToken * tokenAmount;
            const upiAmountPaise = Math.floor(totalINR * 100); // Convert to paise

            const result = {
                tokenSymbol,
                tokenAmount,
                pricePerToken,
                totalINR: totalINR.toFixed(2),
                upiAmountPaise,
                formattedINR: `₹${totalINR.toFixed(2)}`,
                timestamp: new Date().toISOString(),
            };

            console.log(`🧮 Price calculation:`, result);
            return result;
        } catch (error) {
            console.error("❌ Price calculation failed:", error);
            throw error;
        }
    }

    /**
     * Get multiple token prices at once
     * @param {Array<string>} tokenSymbols - Array of token symbols
     * @returns {Promise<Object>} Price mapping
     */
    async getMultiplePrices(tokenSymbols) {
        try {
            const pricePromises = tokenSymbols.map((symbol) =>
                this.getTokenPriceINR(symbol).then((price) => ({
                    symbol,
                    price,
                }))
            );

            const results = await Promise.all(pricePromises);
            const priceMap = {};

            results.forEach(({ symbol, price }) => {
                priceMap[symbol] = price;
            });

            console.log("📊 Multiple prices fetched:", priceMap);
            return priceMap;
        } catch (error) {
            console.error("❌ Multiple price fetch failed:", error);
            throw error;
        }
    }

    /**
     * Validate if price is within acceptable range for instant fulfillment
     * @param {string} tokenSymbol - Token symbol
     * @param {number} expectedPrice - Expected price in INR
     * @param {number} tolerance - Tolerance percentage (default 2%)
     * @returns {Promise<boolean>} Whether price is acceptable
     */
    async validatePriceRange(tokenSymbol, expectedPrice, tolerance = 2) {
        try {
            const currentPrice = await this.getTokenPriceINR(tokenSymbol);
            const priceDiff =
                (Math.abs(currentPrice - expectedPrice) / expectedPrice) * 100;

            const isValid = priceDiff <= tolerance;
            console.log(
                `✅ Price validation for ${tokenSymbol}: ${
                    isValid ? "VALID" : "INVALID"
                } (${priceDiff.toFixed(2)}% diff)`
            );

            return isValid;
        } catch (error) {
            console.error("❌ Price validation failed:", error);
            return false;
        }
    }

    /**
     * Clear price cache (useful for testing)
     */
    clearCache() {
        this.cache.clear();
        console.log("🗑️ Price cache cleared");
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        const entries = Array.from(this.cache.entries()).map(
            ([key, value]) => ({
                token: key,
                price: value.price,
                age: Date.now() - value.timestamp,
            })
        );

        return {
            cacheSize: this.cache.size,
            entries,
        };
    }
}

module.exports = CoinGeckoAPI;
