const axios = require("axios");
require("dotenv").config();

/**
 * Test RazorpayX credentials with a simple API call
 */
async function testCredentials() {
    try {
        console.log("🔐 Testing RazorpayX Credentials with Simple API Call...");
        console.log("=====================================================");

        const keyId = process.env.RAZORPAYX_KEY_ID;
        const keySecret = process.env.RAZORPAYX_KEY_SECRET;

        // Create authorization header
        const credentials = `${keyId}:${keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");
        const authHeader = `Basic ${base64Credentials}`;

        console.log(
            `🔑 Using Auth: Basic ${base64Credentials.substring(0, 20)}...`
        );

        // Try to get account balance first (simpler API call)
        console.log("\n📊 Testing Account Balance API...");

        try {
            const balanceResponse = await axios.get(
                "https://api.razorpay.com/v1/accounts/balance",
                {
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("✅ Balance API Success!");
            console.log(
                "Response:",
                JSON.stringify(balanceResponse.data, null, 2)
            );
        } catch (balanceError) {
            console.log("❌ Balance API Failed:");
            if (balanceError.response) {
                console.log(`Status: ${balanceError.response.status}`);
                console.log(
                    "Response:",
                    JSON.stringify(balanceError.response.data, null, 2)
                );
            } else {
                console.log("Error:", balanceError.message);
            }
        }

        // Try to list contacts (another simple API)
        console.log("\n👥 Testing Contacts API...");

        try {
            const contactsResponse = await axios.get(
                "https://api.razorpay.com/v1/contacts",
                {
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("✅ Contacts API Success!");
            console.log(
                "Response:",
                JSON.stringify(contactsResponse.data, null, 2)
            );
        } catch (contactsError) {
            console.log("❌ Contacts API Failed:");
            if (contactsError.response) {
                console.log(`Status: ${contactsError.response.status}`);
                console.log(
                    "Response:",
                    JSON.stringify(contactsError.response.data, null, 2)
                );
            } else {
                console.log("Error:", contactsError.message);
            }
        }

        // If both fail, let's try the basic payouts endpoint with a GET request
        console.log("\n💰 Testing Payouts List API...");

        try {
            const payoutsResponse = await axios.get(
                "https://api.razorpay.com/v1/payouts",
                {
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("✅ Payouts List API Success!");
            console.log(
                "Response:",
                JSON.stringify(payoutsResponse.data, null, 2)
            );
        } catch (payoutsError) {
            console.log("❌ Payouts List API Failed:");
            if (payoutsError.response) {
                console.log(`Status: ${payoutsError.response.status}`);
                console.log(
                    "Response:",
                    JSON.stringify(payoutsError.response.data, null, 2)
                );
            } else {
                console.log("Error:", payoutsError.message);
            }
        }
    } catch (error) {
        console.error("💥 Unexpected error:", error);
    }
}

// Run the credential test
console.log("🚀 Starting Credential Test...");
testCredentials();
