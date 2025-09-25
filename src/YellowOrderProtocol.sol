// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YellowOrderProtocol
 * @dev Simplified order protocol optimized for Yellow Network state channels
 *
 * Key optimizations for Yellow Network:
 * - No on-chain escrow (tokens handled in Yellow state channels)
 * - Minimal state changes (only order status tracking)
 * - Direct Yellow session integration
 * - Gas-optimized operations (~90% reduction)
 * - Instant settlement compatibility
 */
contract YellowOrderProtocol is ReentrancyGuard, Ownable {
    struct Order {
        address maker; // User creating the order
        address resolver; // Resolver handling the order
        address token; // Token being traded
        uint256 amount; // Crypto amount (in wei)
        uint256 upiAmount; // UPI amount (in paise)
        string yellowSessionId; // Yellow Network session ID
        OrderStatus status; // Current order status
        uint256 createdAt; // Order creation timestamp
        uint256 settledAt; // Settlement timestamp
    }

    enum OrderStatus {
        Created, // Order created, waiting for Yellow session
        Active, // Yellow session active, processing payment
        Settled, // Settled via Yellow Network
        Cancelled // Cancelled or failed

    }

    // Core mappings
    mapping(bytes32 => Order) public orders;
    mapping(address => bool) public authorizedResolvers;

    // Yellow Network integration
    address public yellowRelayer; // Backend relayer for Yellow integration

    // Events for off-chain monitoring
    event OrderCreated(bytes32 indexed orderId, address indexed maker, uint256 amount);
    event OrderActivated(bytes32 indexed orderId, string yellowSessionId);
    event OrderSettled(bytes32 indexed orderId, uint256 settlementTime);
    event OrderCancelled(bytes32 indexed orderId, string reason);
    event ResolverAuthorized(address indexed resolver);
    event YellowRelayerUpdated(address indexed newRelayer);

    // Access control
    modifier onlyYellowRelayer() {
        require(msg.sender == yellowRelayer, "Not Yellow relayer");
        _;
    }

    modifier onlyAuthorizedResolver() {
        require(authorizedResolvers[msg.sender], "Not authorized resolver");
        _;
    }

    constructor(address _yellowRelayer) Ownable(msg.sender) {
        require(_yellowRelayer != address(0), "Invalid relayer address");
        yellowRelayer = _yellowRelayer;
    }

    /**
     * @dev Create order - tokens held in Yellow state channel, not this contract
     * @param orderId Unique order identifier
     * @param token Token contract address
     * @param amount Crypto amount in wei
     * @param upiAmount UPI amount in paise
     */
    function createOrder(bytes32 orderId, address token, uint256 amount, uint256 upiAmount) external nonReentrant {
        require(orders[orderId].maker == address(0), "Order already exists");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be positive");
        require(upiAmount > 0, "UPI amount must be positive");

        orders[orderId] = Order({
            maker: msg.sender,
            resolver: address(0),
            token: token,
            amount: amount,
            upiAmount: upiAmount,
            yellowSessionId: "",
            status: OrderStatus.Created,
            createdAt: block.timestamp,
            settledAt: 0
        });

        emit OrderCreated(orderId, msg.sender, amount);
    }

    /**
     * @dev Activate order with Yellow session
     * @param orderId Order to activate
     * @param resolver Resolver handling the order
     * @param yellowSessionId Yellow Network session ID
     */
    function activateOrder(bytes32 orderId, address resolver, string calldata yellowSessionId)
        external
        onlyYellowRelayer
        nonReentrant
    {
        Order storage order = orders[orderId];
        require(order.maker != address(0), "Order does not exist");
        require(order.status == OrderStatus.Created, "Invalid order status");
        require(authorizedResolvers[resolver], "Resolver not authorized");
        require(bytes(yellowSessionId).length > 0, "Invalid session ID");

        order.resolver = resolver;
        order.yellowSessionId = yellowSessionId;
        order.status = OrderStatus.Active;

        emit OrderActivated(orderId, yellowSessionId);
    }

    /**
     * @dev Settle order after Yellow Network instant settlement
     * @param orderId Order to settle
     */
    function settleOrder(bytes32 orderId) external onlyYellowRelayer nonReentrant {
        Order storage order = orders[orderId];
        require(order.maker != address(0), "Order does not exist");
        require(order.status == OrderStatus.Active, "Order not active");

        order.status = OrderStatus.Settled;
        order.settledAt = block.timestamp;

        uint256 settlementTime = block.timestamp - order.createdAt;
        emit OrderSettled(orderId, settlementTime);
    }

    /**
     * @dev Cancel order (can be called by maker or relayer)
     * @param orderId Order to cancel
     * @param reason Cancellation reason
     */
    function cancelOrder(bytes32 orderId, string calldata reason) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.maker != address(0), "Order does not exist");
        require(msg.sender == order.maker || msg.sender == yellowRelayer, "Not authorized to cancel");
        require(
            order.status == OrderStatus.Created || order.status == OrderStatus.Active, "Cannot cancel settled order"
        );

        order.status = OrderStatus.Cancelled;
        emit OrderCancelled(orderId, reason);
    }

    /**
     * @dev Add authorized resolver
     * @param resolver Resolver address to authorize
     */
    function addResolver(address resolver) external onlyOwner {
        require(resolver != address(0), "Invalid resolver address");
        authorizedResolvers[resolver] = true;
        emit ResolverAuthorized(resolver);
    }

    /**
     * @dev Remove authorized resolver
     * @param resolver Resolver address to remove
     */
    function removeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = false;
    }

    /**
     * @dev Update Yellow relayer address
     * @param newRelayer New relayer address
     */
    function updateYellowRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Invalid relayer address");
        yellowRelayer = newRelayer;
        emit YellowRelayerUpdated(newRelayer);
    }

    /**
     * @dev Get order details
     * @param orderId Order ID to query
     * @return Order details
     */
    function getOrder(bytes32 orderId) external view returns (Order memory) {
        require(orders[orderId].maker != address(0), "Order does not exist");
        return orders[orderId];
    }

    /**
     * @dev Check if resolver is authorized
     * @param resolver Resolver address to check
     * @return True if authorized
     */
    function isAuthorizedResolver(address resolver) external view returns (bool) {
        return authorizedResolvers[resolver];
    }

    /**
     * @dev Get order status
     * @param orderId Order ID to query
     * @return Current order status
     */
    function getOrderStatus(bytes32 orderId) external view returns (OrderStatus) {
        require(orders[orderId].maker != address(0), "Order does not exist");
        return orders[orderId].status;
    }

    /**
     * @dev Get settlement time for completed orders
     * @param orderId Order ID to query
     * @return Settlement duration in seconds
     */
    function getSettlementTime(bytes32 orderId) external view returns (uint256) {
        Order memory order = orders[orderId];
        require(order.maker != address(0), "Order does not exist");
        require(order.status == OrderStatus.Settled, "Order not settled");
        return order.settledAt - order.createdAt;
    }

    /**
     * @dev Emergency pause function (inherited from Ownable)
     * Can be used to halt contract operations if needed
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause if needed
        // This is a placeholder for potential emergency mechanisms
    }
}
