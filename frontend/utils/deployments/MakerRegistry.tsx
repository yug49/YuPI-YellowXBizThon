const MakerRegistryAddress = "0x819fD6110FC56966F514f9d1adf7E78e0c878790";

const MakerRegistryAbi = [
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
            "name": "MakerRegistry__AlreadyRegistered",
            "inputs": []
        },
        {
            "type": "error",
            "name": "MakerRegistry__InvalidAddress",
            "inputs": []
        },
        {
            "type": "error",
            "name": "MakerRegistry__InvalidProof",
            "inputs": []
        },
        {
            "type": "error",
            "name": "MakerRegistry__MakerNotRegisteredYet",
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

export { MakerRegistryAddress, MakerRegistryAbi };