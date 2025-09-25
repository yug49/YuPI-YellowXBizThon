const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        walletAddress: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
            validate: {
                validator: function (v) {
                    return /^0x[a-fA-F0-9]{40}$/.test(v);
                },
                message: "Invalid wallet address format",
            },
        },
        amount: {
            type: String, // Using string to handle large numbers
            required: true,
        },
        tokenAddress: {
            type: String,
            required: true,
            lowercase: true,
            validate: {
                validator: function (v) {
                    return /^0x[a-fA-F0-9]{40}$/.test(v);
                },
                message: "Invalid token address format",
            },
        },
        startPrice: {
            type: String, // Using string to handle 18 decimal precision
            required: true,
        },
        endPrice: {
            type: String, // Using string to handle 18 decimal precision
            required: true,
        },
        recipientUpiAddress: {
            type: String,
            required: true,
            trim: true,
        },
        transactionHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        blockNumber: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: [
                "created",
                "auction_active",
                "accepted",
                "fulfilled",
                "failed",
            ],
            default: "created",
            index: true,
        },
        // Dutch Auction fields
        auctionActive: {
            type: Boolean,
            default: false,
            index: true,
        },
        auctionStartTime: {
            type: Date,
            default: null,
        },
        auctionEndTime: {
            type: Date,
            default: null,
        },
        currentPrice: {
            type: String, // Current price during auction
            default: null,
        },
        acceptedPrice: {
            type: String, // Final accepted price
            default: null,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
        acceptedBy: {
            type: String, // Resolver address that accepted
            default: null,
            validate: {
                validator: function (v) {
                    return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
                },
                message: "Invalid acceptedBy address format",
            },
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
orderSchema.index({ walletAddress: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ auctionActive: 1, auctionEndTime: 1 });

// Update the updatedAt field before saving
orderSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

// Instance method to get formatted order data
orderSchema.methods.toFormattedJSON = function () {
    return {
        orderId: this.orderId,
        walletAddress: this.walletAddress,
        amount: this.amount,
        tokenAddress: this.tokenAddress,
        startPrice: this.startPrice,
        endPrice: this.endPrice,
        recipientUpiAddress: this.recipientUpiAddress,
        transactionHash: this.transactionHash,
        blockNumber: this.blockNumber,
        status: this.status,
        auctionActive: this.auctionActive,
        auctionStartTime: this.auctionStartTime,
        auctionEndTime: this.auctionEndTime,
        currentPrice: this.currentPrice,
        acceptedPrice: this.acceptedPrice,
        acceptedAt: this.acceptedAt,
        acceptedBy: this.acceptedBy,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

// Static method to find orders by wallet address
orderSchema.statics.findByWallet = function (walletAddress, options = {}) {
    const query = { walletAddress: walletAddress.toLowerCase() };

    if (options.status) {
        query.status = options.status;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

// Static method to find order by orderId
orderSchema.statics.findByOrderId = function (orderId) {
    return this.findOne({ orderId });
};

module.exports = mongoose.model("Order", orderSchema);
