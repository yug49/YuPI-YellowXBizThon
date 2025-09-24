const OrderProtocolAddress = "0xC3dd62f9EE406b43A2f463b3a59BEcDC1579933b";

const OrderProtocolAbi = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_maxOrderTime",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_resolverRegistry",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_relayerAddress",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_maxFullfillmentTime",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_resolverFee",
                    "type": "uint16",
                    "internalType": "uint16"
                },
                {
                    "name": "_makerRegistry",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "PRECISION",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "acceptOrder",
            "inputs": [
                {
                    "name": "_orderId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                {
                    "name": "_acceptedPrice",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_taker",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "addToken",
            "inputs": [
                {
                    "name": "_token",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "createOrder",
            "inputs": [
                {
                    "name": "_amount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_token",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_startPrice",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_endPrice",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_recipientUpiAddress",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [
                {
                    "name": "orderId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "fullfillOrder",
            "inputs": [
                {
                    "name": "_orderId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                { "name": "_proof", "type": "string", "internalType": "string" }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "getOrder",
            "inputs": [
                {
                    "name": "_orderId",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple",
                    "internalType": "struct OrderProtocol.Order",
                    "components": [
                        {
                            "name": "maker",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "taker",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "recipientUpiAddress",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "amount",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "token",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "startPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "acceptedPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "endPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "startTime",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "acceptedTime",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "accepted",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "fullfilled",
                            "type": "bool",
                            "internalType": "bool"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getOrdersByMaker",
            "inputs": [
                {
                    "name": "_maker",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple[]",
                    "internalType": "struct OrderProtocol.Order[]",
                    "components": [
                        {
                            "name": "maker",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "taker",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "recipientUpiAddress",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "amount",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "token",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "startPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "acceptedPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "endPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "startTime",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "acceptedTime",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "accepted",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "fullfilled",
                            "type": "bool",
                            "internalType": "bool"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getOrdersByTaker",
            "inputs": [
                {
                    "name": "_taker",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple[]",
                    "internalType": "struct OrderProtocol.Order[]",
                    "components": [
                        {
                            "name": "maker",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "taker",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "recipientUpiAddress",
                            "type": "string",
                            "internalType": "string"
                        },
                        {
                            "name": "amount",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "token",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "startPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "acceptedPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "endPrice",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "startTime",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "acceptedTime",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "accepted",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "fullfilled",
                            "type": "bool",
                            "internalType": "bool"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_makerRegistry",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_maxFullfillmentTime",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_maxOrderTime",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_relayerAddress",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_resolverFee",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "uint16", "internalType": "uint16" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_resolverRegistry",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "removeToken",
            "inputs": [
                {
                    "name": "_token",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "s_makerToOrderIds",
            "inputs": [
                { "name": "", "type": "address", "internalType": "address" },
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "outputs": [
                { "name": "", "type": "bytes32", "internalType": "bytes32" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "s_orderCount",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "s_orderIdToOrder",
            "inputs": [
                { "name": "", "type": "bytes32", "internalType": "bytes32" }
            ],
            "outputs": [
                {
                    "name": "maker",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "taker",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "recipientUpiAddress",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "token",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "startPrice",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "acceptedPrice",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "endPrice",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "startTime",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "acceptedTime",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                { "name": "accepted", "type": "bool", "internalType": "bool" },
                { "name": "fullfilled", "type": "bool", "internalType": "bool" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "s_orderIdToProof",
            "inputs": [
                { "name": "", "type": "bytes32", "internalType": "bytes32" }
            ],
            "outputs": [
                { "name": "", "type": "string", "internalType": "string" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "s_supportedTokens",
            "inputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "s_takerToOrderIds",
            "inputs": [
                { "name": "", "type": "address", "internalType": "address" },
                { "name": "", "type": "uint256", "internalType": "uint256" }
            ],
            "outputs": [
                { "name": "", "type": "bytes32", "internalType": "bytes32" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "OrderAccepted",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "taker",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "acceptedPrice",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OrderCreated",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "maker",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OrderFailed",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "maker",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OrderFullfilled",
            "inputs": [
                {
                    "name": "orderId",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "taker",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "proof",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "OrderProtocol__AlreadyAccepted",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OrderProtocol__AlreadyFullfilled",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OrderProtocol__InvalidAmount",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OrderProtocol__InvalidPrice",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OrderProtocol__InvalidToken",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OrderProtocol__MaxFullfillmentTimeReached",
            "inputs": []
        },
        { "type": "error", "name": "OrderProtocol__NotAMaker", "inputs": [] },
        {
            "type": "error",
            "name": "OrderProtocol__NotAResolver",
            "inputs": []
        },
        { "type": "error", "name": "OrderProtocol__NotRelayer", "inputs": [] },
        {
            "type": "error",
            "name": "OrderProtocol__OrderDoesNotExists",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OrderProtocol__OrderNotAcceptedYet",
            "inputs": []
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        }
    ];
    
export { OrderProtocolAddress, OrderProtocolAbi };