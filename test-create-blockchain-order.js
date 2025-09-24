const {
    createWalletClient,
    createPublicClient,
    http,
    privateKeyToAccount,
} = require("viem");
const { worldchainSepolia } = require("viem/chains");

async function createBlockchainOrder() {
    console.log("🔗 Creating Real Blockchain Order");
    console.log("=================================");

    const rpcUrl =
        "https://worldchain-sepolia.g.alchemy.com/v2/ydzpyjQ8ltFGNlU9MwB0q";
    const contractAddress = "0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b";
    const privateKey =
        "6c1db0c528e7cac4202419249bc98d3df647076707410041e32f6e9080906bfb"; // Test private key

    // Create account and clients
    const account = privateKeyToAccount(`0x${privateKey}`);
    const publicClient = createPublicClient({
        chain: worldchainSepolia,
        transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
        account,
        chain: worldchainSepolia,
        transport: http(rpcUrl),
    });

    console.log(`📋 Account: ${account.address}`);

    // Contract ABI for createOrder function
    const contractABI = [
        {
            inputs: [
                { internalType: "uint256", name: "_amount", type: "uint256" },
                { internalType: "address", name: "_token", type: "address" },
                {
                    internalType: "uint256",
                    name: "_startPrice",
                    type: "uint256",
                },
                { internalType: "uint256", name: "_endPrice", type: "uint256" },
                {
                    internalType: "string",
                    name: "_recipientUpiAddress",
                    type: "string",
                },
            ],
            name: "createOrder",
            outputs: [
                { internalType: "bytes32", name: "orderId", type: "bytes32" },
            ],
            stateMutability: "nonpayable",
            type: "function",
        },
    ];

    try {
        // Order parameters
        const amount = "100000000000000000000"; // 100 INR in wei
        const token = "0x32B9dB3C79340317b5F9A33eD2c599e63380283C"; // Test token
        const startPrice = "90000000000000000000"; // 90 INR in wei
        const endPrice = "80000000000000000000"; // 80 INR in wei
        const recipientUpi = "testblockchain@upi";

        console.log("📤 Creating order on blockchain...");
        console.log(`   Amount: ${amount} (100 INR)`);
        console.log(`   Token: ${token}`);
        console.log(`   Start Price: ${startPrice} (90 INR)`);
        console.log(`   End Price: ${endPrice} (80 INR)`);
        console.log(`   UPI: ${recipientUpi}`);

        // Send transaction to create order
        const txHash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: "createOrder",
            args: [amount, token, startPrice, endPrice, recipientUpi],
        });

        console.log(`✅ Transaction sent: ${txHash}`);
        console.log("⏳ Waiting for confirmation...");

        // Wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });
        console.log(`✅ Order created! Block: ${receipt.blockNumber}`);

        // Extract order ID from logs if available
        if (receipt.logs && receipt.logs.length > 0) {
            console.log(`📋 Logs:`, receipt.logs);
        }

        console.log("\n🎯 Expected Result:");
        console.log("   ✅ Resolver bot should detect this new order");
        console.log("   ✅ Resolver will attempt to accept it");
        console.log("   ✅ We should see debugging output from backend");
    } catch (error) {
        console.error("❌ Failed to create blockchain order:", error.message);
        if (error.details) {
            console.error("   Details:", error.details);
        }
    }
}

createBlockchainOrder().catch(console.error);
