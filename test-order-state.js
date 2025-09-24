const { createPublicClient, http } = require("viem");
const { worldchainSepolia } = require("viem/chains");

async function checkOrderState() {
    console.log("🔍 Checking Order State on Blockchain");
    console.log("====================================");

    const rpcUrl =
        "https://worldchain-sepolia.g.alchemy.com/v2/ydzpyjQ8ltFGNlU9MwB0q";
    const contractAddress = "0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b";

    // This is the orderId from our test
    const orderId =
        "0x7751f54d9c95c000000000000000000000000000000000000000000000000000";

    const publicClient = createPublicClient({
        chain: worldchainSepolia,
        transport: http(rpcUrl),
    });

    // OrderProtocol contract ABI for reading orders
    const contractABI = [
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
                            internalType: "uint256",
                            name: "amount",
                            type: "uint256",
                        },
                        {
                            internalType: "address",
                            name: "tokenAddress",
                            type: "address",
                        },
                        {
                            internalType: "uint256",
                            name: "startPrice",
                            type: "uint256",
                        },
                        {
                            internalType: "uint256",
                            name: "endPrice",
                            type: "uint256",
                        },
                        {
                            internalType: "string",
                            name: "recipientUpiAddress",
                            type: "string",
                        },
                        {
                            internalType: "enum OrderProtocol.OrderStatus",
                            name: "status",
                            type: "uint8",
                        },
                        {
                            internalType: "uint256",
                            name: "acceptedPrice",
                            type: "uint256",
                        },
                        {
                            internalType: "address",
                            name: "acceptedBy",
                            type: "address",
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

    try {
        console.log(`📖 Reading order ${orderId} from contract...`);

        const orderData = await publicClient.readContract({
            address: contractAddress,
            abi: contractABI,
            functionName: "getOrder",
            args: [orderId],
        });

        console.log("✅ Order found on blockchain:");
        console.log(`   Maker: ${orderData[0]}`);
        console.log(`   Taker: ${orderData[1]}`);
        console.log(`   Amount: ${orderData[2].toString()}`);
        console.log(`   Token: ${orderData[3]}`);
        console.log(`   Start Price: ${orderData[4].toString()}`);
        console.log(`   End Price: ${orderData[5].toString()}`);
        console.log(`   UPI: ${orderData[6]}`);
        console.log(
            `   Status: ${orderData[7]} (0=Active, 1=Accepted, 2=Fulfilled, 3=Cancelled)`
        );
        console.log(`   Accepted Price: ${orderData[8].toString()}`);
        console.log(`   Accepted By: ${orderData[9]}`);

        if (orderData[7] === 0) {
            console.log("✅ Order is ACTIVE - ready for acceptance");
        } else if (orderData[7] === 1) {
            console.log("❌ Order is already ACCEPTED");
        } else if (orderData[7] === 2) {
            console.log("❌ Order is already FULFILLED");
        } else if (orderData[7] === 3) {
            console.log("❌ Order is CANCELLED");
        }
    } catch (error) {
        if (error.message.includes("OrderProtocol__OrderNotFound")) {
            console.log("❌ Order NOT found on blockchain");
            console.log(
                "   This means the order was created in the database but never posted to the blockchain"
            );
        } else {
            console.error("❌ Error reading order:", error.message);
        }
    }
}

checkOrderState().catch(console.error);
