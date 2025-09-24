// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {IResolverRegistry} from "./interface/IResolverRegistry.sol";
import {IMakerRegistry} from "./interface/IMakerRegistry.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title OrderProtocol
 * @author Yug Agarwal
 * @dev
 *
 *                          .            .                                   .#                        
 *                        +#####+---+###+#############+-                  -+###.                       
 *                        +###+++####+##-+++++##+++##++####+-.         -+###+++                        
 *                        +#########.-#+--+####++###- -########+---+++#####+++                         
 *                        +#######+#+++--+####+-..-+-.###+++########+-++###++.                         
 *                       +######.     +#-#####+-.-------+############+++####-                          
 *                      +####++...     ########-++-        +##########++++++.                          
 *                     -#######-+.    .########+++          -++######+++-                               
 *                     #++########--+-+####++++-- . ..    .-#++--+##+####.                              
 *                    -+++++++++#####---###---.----###+-+########..-+#++##-                            
 *                    ++###+++++#####-..---.. .+##++++#++#++-+--.   .-++++#                             
 *                   .###+.  .+#+-+###+ ..    +##+##+#++----...---.  .-+--+.                            
 *                   ###+---------+####+   -####+-.......    ...--++.  .---.                           
 *                  -#++++-----#######+-  .-+###+.... .....      .-+##-.  .                            
 *                  ##+++###++######++-.   .--+---++---........  ...---.  .                            
 *                 -####+-+#++###++-.        .--.--...-----.......--..... .                            
 *                 +######+++###+--..---.....  ...---------------.. .. .  .                            
 *                .-#########+#+++--++--------......----++--.--.  .--+---.                             
 *                 -+++########++--++++----------------------.--+++--+++--                             
 *            .######-.-++++###+----------------------..---++--++-+++---..                             
 *            -##########-------+-----------------------+-++-++----..----+----+#####++--..             
 *            -#############+..  ..--..----------.....-+++++++++++++++++##################+.           
 *            --+++++#########+-   . ....  ....... -+++++++++++++++++++############-.----+##-          
 *            -----....-+#######+-             .. -+++++++++++++++++++++##+######+.       +++.         
 *            --------.....---+#####+--......----.+++++++++++++++++++++##+-+++##+.        -++-         
 *            -------...   .--++++++---.....-----.+++++++++++++++++++++++. -+++##-        .---         
 *            #################+--.....-------.  .+++++++++++++++++++++-       -+-.       .---         
 *            +#########++++-.. .......-+--..--++-++++++++++++++++++++-         .-... ....----         
 *            -#####++---..   .--       -+++-.  ..+++++++++++++++++++--        .-+-......-+---         
 *            +####+---...    -+#-   .  --++++-. .+++++++++++++++++++---        --        -+--         
 *            ++++++++++--....-++.--++--.--+++++-.+++++++++++++++++++---. .......         ----         
 *           .--++#########++-.--.+++++--++++###+-++++++++++++++++++++----   .-++-        ----         
 *            .-+#############+-.++#+-+-++#######-++++++++++++++++++++----   -++++-      ..---         
 *           .---+############+.+###++--++#####++-+++++++++++++++++++++-------++++-........-+-         
 *            --+-+##########-+######+++++-++++++-++++++++++++++++++++++-----.----.......---+-         
 *           .--+---#######..+#######+++++++--+++-+++++++++++++++++++++++-----------------+++-         
 *           .++--..-+##-.-########+++++---++ .+-.+++++++++++++++++++++++++++++++++++---+++++-         
 *           -+++. ..-..-+#########++-++--..--....+++++++++++++++++++++++++++++++++++++++++++-         
 *           -++-......-+++############++++----- .+++++++++++++++++++++++++++++++++++++++++++-         
 *           +##-.....---+#######+####+####+--++-.+++++++++++++++++++++++++++++++++++++++++++-         
 *          .#+++-...-++######++-+-----..----++##-+++++++++++++++++++++++++++++++++++++++++++-         
 *          .+++--------+##----+------+-..----+++-+++++++++++++++++++++++++++++++++++++++++++-         
 *           ----.-----+++-+-...------++-----...--+++++++++++++++++++++++++++++++++++++++++++-         
 *          .-..-.--.----..--.... ....++--.  ....-+++++++++++++++++++++++++++++++++++++++++++-         
 *           -----------.---..--..   ..+.  . ... .+++++++++++++++++++++++++++++++++++++++++++-         
 *         .+#+#+---####+-.    .....--...   .    .+++++++++++++++++++++++++++++++++++++++++++-         
 *         -+++++#++++++++.    ..-...--.. ..     .+++++++++++++++++++++++++++++++++++++++++++-         
 *         ++++++-------++--   . ....--.. . . .. .+++++++++++++++++++++++++-+----------...             
 *         -++++--++++.------......-- ...  ..  . .---------------...                                   
 *         -++-+####+++---..-.........                                                                  
 *           .....
 */
contract OrderProtocol is Ownable {
    error OrderProtocol__InvalidAmount();
    error OrderProtocol__InvalidPrice();
    error OrderProtocol__NotAResolver();
    error OrderProtocol__NotRelayer();
    error OrderProtocol__AlreadyAccepted();
    error OrderProtocol__OrderDoesNotExists();
    error OrderProtocol__OrderNotAcceptedYet();
    error OrderProtocol__AlreadyFullfilled();
    error OrderProtocol__MaxFullfillmentTimeReached();
    error OrderProtocol__NotAMaker();
    error OrderProtocol__InvalidToken();

    // Order structure
    struct Order {
        address maker; // the order maker, one paying using the app
        address taker; // the order taker, one accepting the order in the dutch auction
        string recipientUpiAddress; // the UPI address of the recipient to whom the payment is to be made
        uint256 amount; // the amount of the INR to be paid in 18 decimals
        address token; // token address of the asset to be traded
        uint256 startPrice; // the starting price of the order - token's price in INR in 18 decimals
        uint256 acceptedPrice; // the price at which the order was accepted - token's price in INR in 18 decimals
        uint256 endPrice; // the ending price of the order - token's price in INR in 18 decimals
        uint256 startTime; // the time at which the order was created
        uint256 acceptedTime; // the time at which the order was accepted
        bool accepted; // whether the order has been accepted
        bool fullfilled; // whether the order has been fullfilled
    }

    // State Variables

    mapping(bytes32 => Order) public s_orderIdToOrder; // orderId to Order details
    mapping(address => bytes32[]) public s_makerToOrderIds; // maker address to list of orderIds
    mapping(address => bytes32[]) public s_takerToOrderIds; // taker address to list of orderIds
    mapping(address => bool) public s_supportedTokens; // mapping of supported token addresses
    mapping(bytes32 => string) public s_orderIdToProof; // orderId to proof strings generated by RazorPayX(transaction ids)
    uint256 public s_orderCount; // total number of orders created
    uint256 public immutable i_maxOrderTime; // maximum time duration for which an order is valid to be accepted (5-10)
    address public i_resolverRegistry; // address of the ResolverRegistry contract
    address public i_relayerAddress; // address of the relayer
    uint16 public immutable i_resolverFee; // fee percentage (in basis points) charged by the resolver for
    uint256 public immutable i_maxFullfillmentTime; // maximum time duration within which an accepted order must be fulfilled + a buffer time for relayer to verify proof before calling (30-40 seconds)
    address public i_makerRegistry; // address of the MakerRegistry contract

    uint256 public constant PRECISION = 1e18; // precision for price calculations (INR amounts and prices are in 18 decimals)

    // Helper Functions

    /**
     * @notice Calculate the amount of tokens needed for a given INR amount and price
     * @param _inrAmount The INR amount in 18 decimals
     * @param _priceInrPerToken The price of token in INR (18 decimals)
     * @param _token The token address to get decimals
     * @return The amount of tokens in the token's native decimals
     */
    function _calculateTokenAmount(uint256 _inrAmount, uint256 _priceInrPerToken, address _token)
        private
        view
        returns (uint256)
    {
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();
        // Formula: tokenAmount = (inrAmount * 10^tokenDecimals) / priceInrPerToken
        // This gives us the token amount in the token's native decimals
        return (_inrAmount * (10 ** tokenDecimals)) / _priceInrPerToken;
    }

    /**
     * @notice Calculate resolver fee for a given token amount
     * @param _tokenAmount The token amount in token's native decimals
     * @return The resolver fee amount in token's native decimals
     */
    function _calculateResolverFee(uint256 _tokenAmount) private view returns (uint256) {
        return (_tokenAmount * i_resolverFee) / 10000;
    }

    // Events

    event OrderCreated(bytes32 indexed orderId, address indexed maker, uint256 amount);

    event OrderAccepted(bytes32 indexed orderId, address indexed taker, uint256 acceptedPrice);

    event OrderFullfilled(bytes32 indexed orderId, address indexed taker, string proof);
    event OrderFailed(bytes32 indexed orderId, address indexed maker);

    // Modifiers

    /**
     *
     * Reverts if the caller is not a registered maker
     */
    modifier onlyMaker() {
        if (!IMakerRegistry(i_makerRegistry).isMaker(msg.sender)) {
            revert OrderProtocol__NotAMaker();
        }
        _;
    }

    /**
     *
     * @param _orderId The ID of the order to be checked
     */
    modifier orderShouldNotBeExpired(bytes32 _orderId) {
        Order memory order = s_orderIdToOrder[_orderId];
        if (order.fullfilled) revert OrderProtocol__AlreadyFullfilled();
        if (block.timestamp > order.startTime + i_maxOrderTime) {
            // Calculate refund amount - what was originally paid by maker
            uint256 totalTokenAmountPaid = _calculateTokenAmount(order.amount, order.endPrice, order.token);
            uint256 resolverFeeAmountPaid = _calculateResolverFee(totalTokenAmountPaid);
            uint256 totalRefundAmount = totalTokenAmountPaid + resolverFeeAmountPaid;

            IERC20(order.token).transfer(order.maker, totalRefundAmount);
            order.fullfilled = true;
            s_orderIdToOrder[_orderId] = order;
            return;
        }
        _;
    }

    /**
     *
     * Reverts if the caller is not the relayer
     */
    modifier relayerOnly() {
        if (msg.sender != i_relayerAddress) {
            revert OrderProtocol__NotRelayer();
        }
        _;
    }

    // Constructor

    /**
     * @param _maxOrderTime Maximum time duration for which an order is valid
     * @param _resolverRegistry Address of the ResolverRegistry contract
     * @param _relayerAddress Address of the relayer (if any)
     * @param _maxFullfillmentTime Maximum time duration within which an accepted order must be fulfilled
     * @param _resolverFee Fee percentage (in basis points) charged by the resolver for
     * @param _makerRegistry Address of the MakerRegistry contract
     */
    constructor(
        uint256 _maxOrderTime,
        address _resolverRegistry,
        address _relayerAddress,
        uint256 _maxFullfillmentTime,
        uint16 _resolverFee,
        address _makerRegistry
    ) Ownable(msg.sender) {
        i_maxOrderTime = _maxOrderTime;
        i_resolverRegistry = _resolverRegistry;
        i_relayerAddress = _relayerAddress;
        i_maxFullfillmentTime = _maxFullfillmentTime;
        i_resolverFee = _resolverFee;
        i_makerRegistry = _makerRegistry;
    }

    // Functions

    function addToken(address _token) public onlyOwner {
        s_supportedTokens[_token] = true;
    }

    function removeToken(address _token) public onlyOwner {
        s_supportedTokens[_token] = false;
    }

    /**
     * @notice Creates a new order
     * @param _amount The amount of INR to be paid (in 18 decimals, e.g., 100 INR = 100 * 1e18)
     * @param _startPrice The starting price of the order in INR per token (18 decimals, e.g., 90 INR/USDC = 90 * 1e18)
     * @param _token The address of the token to be traded (e.g., USDC, ETH)
     * @param _endPrice The ending price of the order in INR per token (18 decimals, e.g., 80 INR/USDC = 80 * 1e18)
     * @param _recipientUpiAddress The UPI address of the recipient to whom the payment is to be made
     * @dev The function calculates token amount based on the token's actual decimals:
     *      - For USDC (6 decimals): 100 INR at 80 INR/USDC = (100 * 1e18 * 1e6) / (80 * 1e18) = 1.25 * 1e6 USDC
     *      - For ETH (18 decimals): 100 INR at 80 INR/ETH = (100 * 1e18 * 1e18) / (80 * 1e18) = 1.25 * 1e18 ETH
     *      - Resolver fee is calculated on top of the token amount
     */
    function createOrder(
        uint256 _amount,
        address _token,
        uint256 _startPrice,
        uint256 _endPrice,
        string memory _recipientUpiAddress
    ) public onlyMaker returns (bytes32 orderId) {
        if (_amount == 0) {
            revert OrderProtocol__InvalidAmount();
        }
        if (_startPrice == 0 || _endPrice == 0) {
            revert OrderProtocol__InvalidPrice();
        }
        if (_startPrice <= _endPrice) {
            revert OrderProtocol__InvalidPrice();
        }
        if (!s_supportedTokens[_token]) {
            revert OrderProtocol__InvalidToken();
        }

        // Calculate token amount needed at the end price (worst case scenario)
        uint256 totalTokenAmount = _calculateTokenAmount(_amount, _endPrice, _token);
        // Calculate resolver fee
        uint256 resolverFeeAmount = _calculateResolverFee(totalTokenAmount);
        // Total amount to be paid by maker (including resolver fee)
        uint256 totalPayableAmount = totalTokenAmount + resolverFeeAmount;

        IERC20(_token).transferFrom(msg.sender, address(this), totalPayableAmount);

        orderId = keccak256(abi.encodePacked(msg.sender, _amount, s_orderCount));
        Order memory newOrder = Order({
            maker: msg.sender,
            taker: address(0),
            recipientUpiAddress: _recipientUpiAddress,
            amount: _amount,
            token: _token,
            startPrice: _startPrice,
            acceptedPrice: 0,
            endPrice: _endPrice,
            startTime: block.timestamp,
            acceptedTime: 0,
            accepted: false,
            fullfilled: false
        });

        s_orderCount++;
        s_orderIdToOrder[orderId] = newOrder;
        s_makerToOrderIds[msg.sender].push(orderId);

        emit OrderCreated(orderId, msg.sender, _amount);
    }

    /**
     * @notice Accepts an existing order
     * @param _orderId The ID of the order to be accepted
     * @param _acceptedPrice The price at which the order is accepted
     * @param _taker The address of the taker accepting the order
     * @dev the resolver first accepts the order off-chain in the dutch auction, as soon as accepted this funciton is called by the relayer
     */
    function acceptOrder(bytes32 _orderId, uint256 _acceptedPrice, address _taker)
        public
        orderShouldNotBeExpired(_orderId)
        relayerOnly
    {
        Order memory order = s_orderIdToOrder[_orderId];
        if (order.accepted) {
            revert OrderProtocol__AlreadyAccepted();
        }
        if (order.fullfilled) {
            revert OrderProtocol__AlreadyFullfilled();
        }
        if (order.maker == address(0)) {
            revert OrderProtocol__OrderDoesNotExists();
        }
        if (_acceptedPrice > order.startPrice || _acceptedPrice < order.endPrice) {
            revert OrderProtocol__InvalidPrice();
        }
        if (!IResolverRegistry(i_resolverRegistry).isResolver(_taker)) {
            revert OrderProtocol__NotAResolver();
        }

        order.taker = _taker;
        order.acceptedPrice = _acceptedPrice;
        order.acceptedTime = block.timestamp;
        order.accepted = true;
        s_orderIdToOrder[_orderId] = order;
        s_takerToOrderIds[_taker].push(_orderId);

        emit OrderAccepted(_orderId, _taker, _acceptedPrice);
    }

    /**
     *
     * @param _orderId The ID of the order to be fulfilled
     * @param _proof The transaction proof generated by the RazorPayX API is empty if the payment failed
     * @dev the resolver when the payment is done, submits the proof generated by the RazorPayX payout API to the relayer
     * @dev relayer then verifies the proof off-chain and if it is valid, then it calls this function to mark the order as fulfilled
     * @dev the proof is stored on-chain for record-keeping
     */
    function fullfillOrder(bytes32 _orderId, string memory _proof) public relayerOnly {
        Order memory order = s_orderIdToOrder[_orderId];
        if (!order.accepted) {
            revert OrderProtocol__OrderNotAcceptedYet();
        }
        if (order.fullfilled) {
            revert OrderProtocol__AlreadyFullfilled();
        }
        if (block.timestamp > order.acceptedTime + i_maxFullfillmentTime || bytes(_proof).length == 0) {
            // Payment failed or timed out - refund the maker
            uint256 totalTokenAmountPaid = _calculateTokenAmount(order.amount, order.endPrice, order.token);
            uint256 resolverFeeAmountPaid = _calculateResolverFee(totalTokenAmountPaid);
            uint256 totalRefundAmount = totalTokenAmountPaid + resolverFeeAmountPaid;

            IERC20(order.token).transfer(order.maker, totalRefundAmount);
            order.fullfilled = true;
            s_orderIdToOrder[_orderId] = order;

            emit OrderFailed(_orderId, order.maker);
            return;
        }

        // Calculate how much tokens the resolver should get at the accepted price
        uint256 resolverTokenAmount = _calculateTokenAmount(order.amount, order.acceptedPrice, order.token);
        uint256 resolverFeeAmount = _calculateResolverFee(resolverTokenAmount);
        uint256 totalAmountToResolver = resolverTokenAmount + resolverFeeAmount;

        // Transfer tokens to resolver (this should be done by the protocol, not requiring resolver to pay)
        // Note: The current implementation seems incorrect as it asks resolver to pay tokens
        // The resolver should receive tokens for completing the payment, not pay more tokens

        // Calculate what the maker originally paid
        uint256 makerOriginalTokenAmount = _calculateTokenAmount(order.amount, order.endPrice, order.token);
        uint256 makerOriginalFeeAmount = _calculateResolverFee(makerOriginalTokenAmount);
        uint256 makerTotalPaid = makerOriginalTokenAmount + makerOriginalFeeAmount;

        // Resolver gets the tokens they deserve + fee
        IERC20(order.token).transfer(order.taker, totalAmountToResolver);

        // Return remaining tokens to maker (if any)
        uint256 amountToReturnToMaker = makerTotalPaid - totalAmountToResolver;
        if (amountToReturnToMaker > 0) {
            IERC20(order.token).transfer(order.maker, amountToReturnToMaker);
        }

        s_orderIdToProof[_orderId] = _proof;
        order.fullfilled = true;
        s_orderIdToOrder[_orderId] = order;

        emit OrderFullfilled(_orderId, order.taker, _proof);
    }

    /* Getter Functions */

    /**
     * @notice Get the details of an order
     * @param _orderId The ID of the order to be fetched
     */
    function getOrder(bytes32 _orderId) public view returns (Order memory) {
        return s_orderIdToOrder[_orderId];
    }

    /**
     * @notice Get all orders created by a specific maker
     * @param _maker The address of the maker whose orders are to be fetched
     */
    function getOrdersByMaker(address _maker) public view returns (Order[] memory) {
        bytes32[] memory orderIds = s_makerToOrderIds[_maker];
        Order[] memory orders = new Order[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            orders[i] = s_orderIdToOrder[orderIds[i]];
        }
        return orders;
    }

    /**
     * @notice Get all orders created by a specific taker
     * @param _taker The address of the taker whose orders are to be fetched
     */
    function getOrdersByTaker(address _taker) public view returns (Order[] memory) {
        bytes32[] memory orderIds = s_takerToOrderIds[_taker];
        Order[] memory orders = new Order[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            orders[i] = s_orderIdToOrder[orderIds[i]];
        }
        return orders;
    }
}
