// Contract addresses and ABIs
export const CONTRACTS = {
  MAKER_REGISTRY: {
    address: "0x9B8D39ED5168327d60b1EB23e5bB7F362e060b0d" as const,
    abi: [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "editMaker",
        "inputs": [
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "_newProof",
            "type": "string",
            "internalType": "string"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "getProof",
        "inputs": [
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [
          { "name": "", "type": "string", "internalType": "string" },
          { "name": "", "type": "bool", "internalType": "bool" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "isMaker",
        "inputs": [
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
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
        "name": "registerMaker",
        "inputs": [
          {
            "name": "_identityProof",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "_isForiegner",
            "type": "bool",
            "internalType": "bool"
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
        "name": "s_isForiegner",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_isRegistered",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_proof",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [
          { "name": "", "type": "string", "internalType": "string" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_upiAddress",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [
          { "name": "", "type": "string", "internalType": "string" }
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
      }
    ] as const
  },
  RESOLVER_REGISTRY: {
    address: "0x5A6A4505e5cf78be210eb480e5aBbf7aa781768b" as const,
    abi: [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "addResolver",
        "inputs": [
          {
            "name": "resolver",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "isResolver",
        "inputs": [
          {
            "name": "resolver",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
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
        "name": "removeResolver",
        "inputs": [
          {
            "name": "resolver",
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
        "name": "s_resolvers",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
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
      }
    ] as const
  },
  ORDER_PROTOCOL: {
    address: "0x3433E3504A625e9382D3270F0d68F814709C8a4F" as const,
    abi: [
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
        "name": "i_resolverFee",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "uint16", "internalType": "uint16" }
        ],
        "stateMutability": "view"
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
        "name": "s_supportedTokens",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
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
      }
    ] as const
  },
  ERC20: {
    abi: [
      {
        "type": "function",
        "name": "allowance",
        "inputs": [
          { "name": "owner", "type": "address", "internalType": "address" },
          { "name": "spender", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "approve",
        "inputs": [
          { "name": "spender", "type": "address", "internalType": "address" },
          { "name": "amount", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
          { "name": "account", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string", "internalType": "string" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string", "internalType": "string" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
      }
    ] as const
  }
} as const;