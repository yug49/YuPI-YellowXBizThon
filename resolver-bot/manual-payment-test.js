const ResolverBot = require("./index.js");

/**
 * Manually trigger payment processing for an already accepted order
 */
async function manuallyProcessPayment() {
    try {
        console.log("🔧 Manually Processing Payment for Accepted Order...");
        console.log("==================================================");

        // The order ID from your logs
        const orderId =
            "0x2e3ca2e75fd1b193a8df070bcc33f03d6aa3edfa0e29fe418d881837e0f6da1c";

        console.log(`📋 Processing order: ${orderId}`);

        // Create resolver bot instance
        const bot = new ResolverBot();

        // Skip the full initialization to avoid callback server issues
        // Just set up the basic components we need
        console.log("⚙️ Setting up basic resolver components...");

        const { ethers } = require("ethers");
        const fs = require("fs");
        const path = require("path");
        require("dotenv").config();

        // Set up blockchain connection
        bot.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        bot.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, bot.provider);

        // Load contract ABI
        const abiPath = path.join(__dirname, "abi", "OrderProtocol.json");
        const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

        // Create contract instance
        bot.contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            contractABI,
            bot.wallet
        );

        console.log(`✅ Connected as: ${bot.wallet.address}`);
        console.log(`📋 Contract: ${process.env.CONTRACT_ADDRESS}`);

        // Process the payment for this order
        console.log("\n💳 Processing payment...");
        const success = await bot.processOrderPayment(orderId);

        if (success) {
            console.log("\n🎉 PAYMENT PROCESSED SUCCESSFULLY!");
            console.log("=================================");
            console.log("✅ Order details read from blockchain");
            console.log("✅ Payment amount calculated");
            console.log("✅ RazorpayX contact created");
            console.log("✅ RazorpayX fund account created");
            console.log("✅ UPI payout executed");
            console.log("✅ Payment confirmation displayed");
        } else {
            console.log("\n❌ Payment processing failed");
            console.log("Check the logs above for error details");
        }

        return success;
    } catch (error) {
        console.error("\n💥 Manual payment processing failed:", error);
        return false;
    }
}

console.log("🚀 Manually Processing Payment for Already Accepted Order...");
console.log("This will read the order from blockchain and process the payment");
console.log("============================================================\n");

manuallyProcessPayment()
    .then((success) => {
        if (success) {
            console.log("\n🎊 MANUAL PAYMENT PROCESSING SUCCESSFUL!");
            console.log("The resolver bot payment logic is working correctly!");
        } else {
            console.log("\n❌ Manual payment processing failed");
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("\n💥 Unexpected error:", error);
        process.exit(1);
    });
