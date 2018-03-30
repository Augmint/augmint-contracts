/* Augmint's Internal Exchange

  For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/exchangeFlow.png

    TODO:
        - deduct fee
        - consider take funcs (frequent rate changes with takeBuyToken? send more and send back remainder?)
*/
pragma solidity 0.4.21;

import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";


contract Exchange {
    using SafeMath for uint256;
    AugmintTokenInterface public augmintToken;

    uint public constant CHUNK_SIZE = 100;

    struct Order {
        uint64 index;
        address maker;

        // tokens per ether
        uint32 price;

        // buy order: amount in wei
        // sell order: token amount
        uint amount;
    }

    uint64 public orderCount;
    mapping(uint64 => Order) public buyTokenOrders;
    mapping(uint64 => Order) public sellTokenOrders;

    uint64[] private activeBuyOrders;
    uint64[] private activeSellOrders;

    /* used to stop executing matchMultiple when running out of gas.
        actual is much less, just leaving enough matchMultipleOrders() to finish TODO: fine tune & test it*/
    uint32 private constant ORDER_MATCH_WORST_GAS = 100000;

    event NewOrder(uint64 indexed orderId, address indexed maker, uint32 price, uint tokenAmount,
        uint weiAmount);

    event OrderFill(address indexed tokenBuyer, address indexed tokenSeller, uint64 buyTokenOrderId,
        uint64 sellTokenOrderId, uint32 price, uint weiAmount, uint tokenAmount);

    event CancelledOrder(uint64 indexed orderId, address indexed maker, uint tokenAmount, uint weiAmount);

    function Exchange(AugmintTokenInterface _augmintToken) public {
        augmintToken = _augmintToken;
    }

    function placeBuyTokenOrder(uint32 price) external payable returns (uint64 orderId) {
        require(price > 0);
        require(msg.value > 0);

        orderId = ++orderCount;
        buyTokenOrders[orderId] = Order(uint64(activeBuyOrders.length), msg.sender, price, msg.value);
        activeBuyOrders.push(orderId);

        emit NewOrder(orderId, msg.sender, price, 0, msg.value);
    }

    /* this function requires previous approval to transfer tokens */
    function placeSellTokenOrder(uint32 price, uint tokenAmount) external returns (uint orderId) {
        augmintToken.transferFrom(msg.sender, this, tokenAmount);
        return _placeSellTokenOrder(msg.sender, price, tokenAmount);
    }

    /* place sell token order called from AugmintToken's transferAndNotify
     Flow:
        1) user calls token contract's transferAndNotify price passed in data arg
        2) transferAndNotify transfers tokens to the Exchange contract
        3) transferAndNotify calls Exchange.transferNotification with lockProductId
    */
    function transferNotification(address maker, uint tokenAmount, uint price) external {
        require(msg.sender == address(augmintToken));
        _placeSellTokenOrder(maker, uint32(price), tokenAmount);
    }

    function cancelBuyTokenOrder(uint64 buyTokenId) external {
        Order storage order = buyTokenOrders[buyTokenId];
        require(order.maker == msg.sender);

        uint amount = order.amount;
        order.amount = 0;
        _removeBuyOrder(order);

        msg.sender.transfer(amount);

        emit CancelledOrder(buyTokenId, msg.sender, 0, amount);
    }

    function cancelSellTokenOrder(uint64 sellTokenId) external {
        Order storage order = sellTokenOrders[sellTokenId];
        require(order.maker == msg.sender);

        uint amount = order.amount;
        order.amount = 0;
        _removeSellOrder(order);

        augmintToken.transferWithNarrative(msg.sender, amount, "Sell token order cancelled");

        emit CancelledOrder(sellTokenId, msg.sender, amount, 0);
    }

    /* matches any two orders if the sell price >= buy price
        trade price meets in the middle
        reverts if any of the orders have been removed
    */
    function matchOrders(uint64 buyTokenId, uint64 sellTokenId) external {
        _fillOrder(buyTokenId, sellTokenId);
    }

    /*  matches as many orders as possible from the passed orders
        Runs as long as gas is available for the call.
        Stops if any match is invalid (case when any of the orders removed after client generated the match list sent)
    */
    function matchMultipleOrders(uint64[] buyTokenIds, uint64[] sellTokenIds) external returns(uint matchCount) {
        uint len = buyTokenIds.length;
        require(len == sellTokenIds.length);
        for (uint i = 0; i < len && msg.gas > ORDER_MATCH_WORST_GAS; i++) {
            _fillOrder(buyTokenIds[i], sellTokenIds[i]);
            matchCount++;
        }
    }

    function getActiveOrderCounts() external view returns(uint buyTokenOrderCount, uint sellTokenOrderCount) {
        return(activeBuyOrders.length, activeSellOrders.length);
    }

    // returns CHUNK_SIZE orders starting from offset
    // orders are encoded as [id, maker, price, amount]
    function getActiveBuyOrders(uint offset) external view returns (uint[4][CHUNK_SIZE] response) {
        for (uint8 i = 0; i < CHUNK_SIZE && i + offset < activeBuyOrders.length; i++) {
            uint64 orderId = activeBuyOrders[offset + i];
            Order storage order = buyTokenOrders[orderId];
            response[i] = [orderId, uint(order.maker), order.price, order.amount];
        }
    }

    function getActiveSellOrders(uint offset) external view returns (uint[4][CHUNK_SIZE] response) {
        for (uint8 i = 0; i < CHUNK_SIZE && i + offset < activeSellOrders.length; i++) {
            uint64 orderId = activeSellOrders[offset + i];
            Order storage order = sellTokenOrders[orderId];
            response[i] = [orderId, uint(order.maker), order.price, order.amount];
        }
    }

    function _fillOrder(uint64 buyTokenId, uint64 sellTokenId) private {
        Order storage buy = buyTokenOrders[buyTokenId];
        Order storage sell = sellTokenOrders[sellTokenId];

        require(buy.price >= sell.price);

        // meet in the middle
        uint price = uint(buy.price).add(sell.price).div(2);

        uint sellWei = sell.amount.mul(1 ether).roundedDiv(price);

        uint tradedWei;
        uint tradedTokens;
        if (sellWei <= buy.amount) {
            tradedWei = sellWei;
            tradedTokens = sell.amount;
        } else {
            tradedWei = buy.amount;
            tradedTokens = buy.amount.mul(price).roundedDiv(1 ether);
        }

        buy.amount = buy.amount.sub(tradedWei);
        if (buy.amount == 0) {
            _removeBuyOrder(buy);
        }

        sell.amount = sell.amount.sub(tradedTokens);
        if (sell.amount == 0) {
            _removeSellOrder(sell);
        }

        augmintToken.transferWithNarrative(buy.maker, tradedTokens, "Buy token order fill");
        sell.maker.transfer(tradedWei);

        emit OrderFill(buy.maker, sell.maker, buyTokenId,
            sellTokenId, uint32(price), tradedWei, tradedTokens);
    }

    function _placeSellTokenOrder(address maker, uint32 price, uint tokenAmount)
    private returns (uint64 orderId) {
        require(price > 0);
        require(tokenAmount > 0);

        orderId = ++orderCount;
        sellTokenOrders[orderId] = Order(uint64(activeSellOrders.length), maker, price, tokenAmount);
        activeSellOrders.push(orderId);

        emit NewOrder(orderId, maker, price, tokenAmount, 0);
    }

    function _removeBuyOrder(Order storage order) private {
        _removeOrder(activeBuyOrders, order.index);
    }

    function _removeSellOrder(Order storage order) private {
        _removeOrder(activeSellOrders, order.index);
    }

    function _removeOrder(uint64[] storage orders, uint64 index) private {
        if (index < orders.length - 1) {
            orders[index] = orders[orders.length - 1];
        }
        orders.length--;
    }

}
