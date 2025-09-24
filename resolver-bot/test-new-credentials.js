const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

/**
 * Test the new RazorpayX credentials with the simplified API format
 */
async function testNewCredentials() {
    try {
        console.log("🧪 Testing New RazorpayX Credentials...");
        console.log("======================================");

        const keyId = process.env.RAZORPAYX_KEY_ID;
        const keySecret = process.env.RAZORPAYX_KEY_SECRET;
        const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

        console.log(`🔐 Key ID: ${keyId}`);
        console.log(`🏦 Account: ${accountNumber}`);

        // Create authorization header
        const credentials = `${keyId}:${keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");
        const authHeader = `Basic ${base64Credentials}`;

        console.log(`🔑 Auth: Basic ${base64Credentials.substring(0, 20)}...`);

        // Test UPI details
        const testUpiAddress = "testuser@paytm";
        const testAmount = 100; // 1 INR in paise
        const orderId = `test_${Date.now()}`;

        console.log(`💰 Amount: ${testAmount} paise (₹${testAmount / 100})`);
        console.log(`🏦 UPI: ${testUpiAddress}`);

        // Step 1: Create fund account
        console.log("\n📋 Step 1: Creating Fund Account...");

        const fundAccountPayload = {
            contact: {
                name: "Test User",
                email: "test@example.com",
                contact: "9999999999",
                type: "self",
                reference_id: `order_${orderId}`,
                notes: {
                    order_id: orderId,
                    payment_type: "order_settlement",
                },
            },
            account_type: "vpa",
            vpa: {
                address: testUpiAddress,
            },
        };

        console.log(
            "Fund Account Payload:",
            JSON.stringify(fundAccountPayload, null, 2)
        );

        const fundAccountResponse = await axios.post(
            "https://api.razorpay.com/v1/fund_accounts",
            fundAccountPayload,
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );

        console.log("✅ Fund Account Created!");
        console.log(
            "Response:",
            JSON.stringify(fundAccountResponse.data, null, 2)
        );

        const fundAccountId = fundAccountResponse.data.id;
        console.log(`🆔 Fund Account ID: ${fundAccountId}`);

        // Step 2: Create payout
        console.log("\n💳 Step 2: Creating Payout...");

        const idempotencyKey = uuidv4();

        const payoutPayload = {
            account_number: accountNumber,
            fund_account_id: fundAccountId,
            amount: testAmount,
            currency: "INR",
            mode: "UPI",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: `order_payment_${orderId}`,
            narration: `Test Payment ${orderId}`,
            notes: {
                order_id: orderId,
                payment_method: "UPI",
                processed_by: "resolver_bot_test",
            },
        };

        console.log("Payout Payload:", JSON.stringify(payoutPayload, null, 2));
        console.log(`🆔 Idempotency Key: ${idempotencyKey}`);

        const payoutResponse = await axios.post(
            "https://api.razorpay.com/v1/payouts",
            payoutPayload,
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    "X-Payout-Idempotency": idempotencyKey,
                },
                timeout: 30000,
            }
        );

        console.log("\n✅ PAYOUT SUCCESSFUL!");
        console.log("====================");
        console.log("Response:", JSON.stringify(payoutResponse.data, null, 2));

        const payoutData = payoutResponse.data;

        console.log("\n🎉 PAYMENT COMPLETED SUCCESSFULLY!");
        console.log("=================================");
        console.log(`💰 Amount: ₹${testAmount / 100} (${testAmount} paise)`);
        console.log(`🏦 UPI: ${testUpiAddress}`);
        console.log(`🆔 Payout ID: ${payoutData.id}`);
        console.log(`📊 Status: ${payoutData.status}`);
        console.log(`🔗 UTR: ${payoutData.utr || "Processing..."}`);
        console.log(`💳 Fees: ₹${(payoutData.fees || 0) / 100}`);
        console.log(`📋 Tax: ₹${(payoutData.tax || 0) / 100}`);
        console.log(
            `⏰ Created: ${new Date(
                payoutData.created_at * 1000
            ).toISOString()}`
        );

        return { success: true, data: payoutData };
    } catch (error) {
        console.error("\n❌ TEST FAILED!");
        console.error("================");

        if (error.response) {
            const { status, data } = error.response;
            console.error(`HTTP Status: ${status}`);
            console.error("Error Response:", JSON.stringify(data, null, 2));
        } else {
            console.error("Error:", error.message);
        }

        return { success: false, error: error.message };
    }
}

console.log("🚀 Testing New RazorpayX Credentials...");
console.log("This will create a real fund account and payout");
console.log("============================================\n");

testNewCredentials()
    .then((result) => {
        if (result.success) {
            console.log("\n✅ ALL TESTS PASSED!");
            console.log("🚀 RazorpayX integration is working correctly!");
            console.log(
                "💡 The resolver bot is ready for production payments!"
            );
        } else {
            console.log("\n❌ Tests failed!");
            console.log("🔧 Please check the error details above.");
        }
    })
    .catch((error) => {
        console.error("\n💥 Unexpected error:", error);
    });
