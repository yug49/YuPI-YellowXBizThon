const { createPublicClient, http } = require("viem");
const { base } = require("viem/chains");

async function testContractConnection() {
    console.log("🔧 Testing Basic Contract Connection");
    console.log("==================================");

    const rpcUrl =
        "https://base-mainnet.g.alchemy.com/v2/WhI4CLoqy0ycLxPPoYwSx";
    const contractAddress = "0x3433E3504A625e9382D3270F0d68F814709C8a4F";

    const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });

    try {
        // Test 1: Check contract exists
        console.log("📋 Step 1: Checking if contract exists...");
        const code = await publicClient.getCode({ address: contractAddress });
        if (code === "0x") {
            console.log("❌ Contract does not exist at this address");
            return;
        }
        console.log("✅ Contract exists");

        // Test 2: Try to call a simple view function
        console.log("\n📋 Step 2: Testing simple contract call...");

        // Try to get the order count
        const orderCountABI = [
            {
                inputs: [],
                name: "s_orderCount",
                outputs: [
                    { internalType: "uint256", name: "", type: "uint256" },
                ],
                stateMutability: "view",
                type: "function",
            },
        ];

        try {
            const orderCount = await publicClient.readContract({
                address: contractAddress,
                abi: orderCountABI,
                functionName: "s_orderCount",
            });
            console.log(`✅ Order count: ${orderCount.toString()}`);
        } catch (error) {
            console.log("❌ Failed to read order count:", error.message);
        }

        // Test 3: Try to read an order with a simple ID
        console.log("\n📋 Step 3: Testing order reading...");

        const orderABI = [
            {
                inputs: [
                    {
                        internalType: "bytes32",
                        name: "_orderId",
                        type: "bytes32",
                    },
                ],
                name: "getOrder",
                outputs: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "maker",
                                type: "address",
                            },
                            {
                                internalType: "address",
                                name: "taker",
                                type: "address",
                            },
                            {
                                internalType: "string",
                                name: "recipientUpiAddress",
                                type: "string",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "startPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "acceptedPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "endPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "startTime",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "acceptedTime",
                                type: "uint256",
                            },
                            {
                                internalType: "bool",
                                name: "accepted",
                                type: "bool",
                            },
                            {
                                internalType: "bool",
                                name: "fullfilled",
                                type: "bool",
                            },
                        ],
                        internalType: "struct OrderProtocol.Order",
                        name: "",
                        type: "tuple",
                    },
                ],
                stateMutability: "view",
                type: "function",
            },
        ];

        // Try with a simple order ID (all zeros)
        const testOrderId =
            "0x0000000000000000000000000000000000000000000000000000000000000001";
        console.log(`📤 Trying to read order: ${testOrderId}`);

        try {
            const orderData = await publicClient.readContract({
                address: contractAddress,
                abi: orderABI,
                functionName: "getOrder",
                args: [testOrderId],
            });

            console.log("✅ Order reading works!");
            console.log(`   Maker: ${orderData[0]}`);
            console.log(`   Accepted: ${orderData[10]}`);
        } catch (error) {
            console.log("❌ Order reading failed:", error.message);

            // Try the problematic order ID
            const problematicOrderId =
                "0x3a3d6ac3379a4fd4f15776162dc0f3f2377d842883f91909e7d468175c489f7a";
            console.log(`\n📤 Trying problematic order: ${problematicOrderId}`);

            try {
                const orderData2 = await publicClient.readContract({
                    address: contractAddress,
                    abi: orderABI,
                    functionName: "getOrder",
                    args: [problematicOrderId],
                });
                console.log("✅ Problematic order reading works!");
                console.log(`   Maker: ${orderData2[0]}`);
            } catch (error2) {
                console.log(
                    "❌ Problematic order reading failed:",
                    error2.message
                );
            }
        }
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

testContractConnection().catch(console.error);
