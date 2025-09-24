// Simple test script to verify the calculation logic
function calculateApprovalAmount(
    inrAmount,
    endPrice,
    resolverFee,
    tokenDecimals
) {
    try {
        // Convert to BigInt equivalent for testing
        const amount = BigInt(
            Math.round(parseFloat(inrAmount) * Math.pow(10, 18))
        ); // 18 decimals for INR
        const endPriceBig = BigInt(
            Math.round(parseFloat(endPrice) * Math.pow(10, 18))
        ); // 18 decimals for price

        // Calculate token amount using the new contract logic:
        // tokenAmount = (inrAmount * 10^tokenDecimals) / priceInrPerToken
        const tokenAmount =
            (amount * BigInt(10) ** BigInt(tokenDecimals)) / endPriceBig;

        // Calculate resolver fee on the token amount
        // resolverFeeAmount = (tokenAmount * resolverFee) / 10000
        const feeAmount = (tokenAmount * BigInt(resolverFee)) / BigInt(10000);

        // Total amount to approve = tokenAmount + feeAmount
        const totalPayableAmount = tokenAmount + feeAmount;

        return totalPayableAmount;
    } catch (error) {
        console.error("Error calculating approval amount:", error);
        throw new Error("Failed to calculate approval amount");
    }
}

// Test cases
console.log("Testing calculation with example from user:");
console.log("100 INR, price range 90-80 INR/USDC");

// Test with USDC (6 decimals)
const usdcAmount = calculateApprovalAmount("100", "80", 100, 6); // 100 INR, 80 INR/USDC, 1% fee, 6 decimals
console.log(`USDC (6 decimals): ${usdcAmount.toString()} units`);
console.log(
    `USDC in human readable: ${Number(usdcAmount) / Math.pow(10, 6)} USDC`
);

// Test with ETH (18 decimals)
const ethAmount = calculateApprovalAmount("100", "80", 100, 18); // 100 INR, 80 INR/ETH, 1% fee, 18 decimals
console.log(`ETH (18 decimals): ${ethAmount.toString()} units`);
console.log(
    `ETH in human readable: ${Number(ethAmount) / Math.pow(10, 18)} ETH`
);

console.log(
    "\nBoth should represent the same amount of tokens (1.25) + 1% fee = 1.2625 tokens"
);
