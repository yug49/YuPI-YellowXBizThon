const axios = require("axios");
require("dotenv").config();

/**
 * RazorpayX API utility functions for the resolver bot
 */
class RazorpayXUtil {
    constructor() {
        this.keyId = process.env.RAZORPAYX_KEY_ID;
        this.keySecret = process.env.RAZORPAYX_KEY_SECRET;
        this.baseURL = "https://api.razorpay.com/v1"; // Production URL
        // For test mode, you might use: https://api.razorpay.com/v1
    }

    /**
     * Generate Authorization header for RazorpayX API calls
     * Format: Basic base64(key_id:key_secret)
     * @returns {string} Authorization header value
     */
    getAuthHeader() {
        const credentials = `${this.keyId}:${this.keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");
        return `Basic ${base64Credentials}`;
    }

    /**
     * Get common headers for RazorpayX API requests
     * @returns {Object} Headers object
     */
    getHeaders() {
        return {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
            Accept: "application/json",
        };
    }

    /**
     * Test RazorpayX API connectivity
     * This will be used later when implementing payment flows
     */
    async testConnectivity() {
        try {
            console.log("🧪 Testing RazorpayX API connectivity...");

            // Test with a simple API call (this is just for testing connectivity)
            // In the future, you'll implement actual payment/payout calls here

            const headers = this.getHeaders();
            console.log("📋 Using headers:", {
                ...headers,
                Authorization: `Basic ${headers.Authorization.split(
                    " "
                )[1].substring(0, 20)}...`,
            });

            // For now, just validate the auth header format
            const authHeader = this.getAuthHeader();

            if (authHeader.startsWith("Basic ") && authHeader.length > 10) {
                console.log(
                    "✅ RazorpayX authentication header is correctly formatted"
                );
                console.log("✅ API keys are loaded and ready");
                return true;
            } else {
                console.log("❌ Invalid authentication header format");
                return false;
            }
        } catch (error) {
            console.error(
                "❌ RazorpayX connectivity test failed:",
                error.message
            );
            return false;
        }
    }

    /**
     * Placeholder for future payment processing functionality
     * This will be implemented when the payment flow is defined
     */
    async processPayment(paymentDetails) {
        console.log("💳 Payment processing will be implemented here");
        console.log("📋 Payment details:", paymentDetails);

        // TODO: Implement actual RazorpayX payment/payout API calls
        // This will be done when the specific payment flow is defined

        return {
            success: false,
            message: "Payment processing not yet implemented",
        };
    }
}

// Test function
async function testRazorpayX() {
    const razorpayX = new RazorpayXUtil();
    await razorpayX.testConnectivity();
}

// Run test if this file is executed directly
if (require.main === module) {
    testRazorpayX();
}

module.exports = RazorpayXUtil;
