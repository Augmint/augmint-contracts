/* Augmint's Internal Exchange

  For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/exchangeFlow.png

    TODO:
        - deduct fee
        - consider take funcs (frequent rate changes with takeBuyToken? send more and send back remainder?)
        - uint32 for addedTime?
*/
pragma solidity 0.4.19;

import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";

contract Exchange {
    using SafeMath for uint256;
    AugmintTokenInterface public augmintToken;

    uint public constant CHUNK_SIZE = 100;

    struct Order {
        uint index;
        address maker;
        uint addedTime;

        // tokens per ether
        uint price;

        // buy order: amount in wei 
        // sell order: token amount
        uint amount;    
    }

    Order[] public buyTokenOrders;
    Order[] public sellTokenOrders;

    uint[] private activeBuyOrders;
    uint[] private activeSellOrders;

    /* used to stop executing matchMultiple when running out of gas.
        actual is much less, just leaving enough matchMultipleOrders() to finish TODO: fine tune & test it*/
    uint32 private constant ORDER_MATCH_WORST_GAS = 100000;

    event NewOrder(uint indexed orderId, address indexed maker, uint price, uint tokenAmount,
        uint weiAmount);

    event OrderFill(address indexed tokenBuyer, address indexed tokenSeller, uint buyTokenOrderId,
        uint sellTokenOrderId, uint price, uint weiAmount, uint tokenAmount);

    event CancelledOrder(uint indexed orderId, address indexed maker, uint tokenAmount, uint weiAmount);

    function Exchange(AugmintTokenInterface _augmintToken) public {
        augmintToken = _augmintToken;
    }

    function placeBuyTokenOrder(uint price) external payable returns (uint orderId) {
        require(price > 0);
        require(msg.value > 0);

        orderId = buyTokenOrders.push(Order(activeBuyOrders.length, msg.sender, now, price, msg.value)) - 1;
        activeBuyOrders.push(orderId);

        NewOrder(orderId, msg.sender, price, 0, msg.value);
    }

    /* this function requires previous approval to transfer tokens */
    function placeSellTokenOrder(uint price, uint tokenAmount) external returns (uint orderId) {
        augmintToken.transferFrom(msg.sender, this, tokenAmount);
        return _placeSellTokenOrder(msg.sender, price, tokenAmount);
    }

    function cancelBuyTokenOrder(uint buyTokenId) external {
        Order storage order = buyTokenOrders[buyTokenId];
        require(order.maker == msg.sender);

        uint amount = order.amount;
        order.amount = 0;
        _removeBuyOrder(order);

        msg.sender.transfer(amount);

        CancelledOrder(buyTokenId, msg.sender, 0, amount);
    }

    function cancelSellTokenOrder(uint sellTokenId) external {
        Order storage order = sellTokenOrders[sellTokenId];
        require(order.maker == msg.sender);

        uint amount = order.amount;
        order.amount = 0;
        _removeSellOrder(order);

        augmintToken.transferWithNarrative(msg.sender, amount, "Sell token order cancelled");

        CancelledOrder(sellTokenId, msg.sender, amount, 0);
    }

    /* matches any two orders if the sell price >= buy price
        trade price meets in the middle
        reverts if any of the orders have been removed
    */
    function matchOrders(uint buyTokenId, uint sellTokenId) external {
        _fillOrder(buyTokenId, sellTokenId);
    }

    /*  matches as many orders as possible from the passed orders
        Runs as long as gas is available for the call.
        Stops if any match is invalid (case when any of the orders removed after client generated the match list sent)
    */
    function matchMultipleOrders(uint[] buyTokenIds, uint[] sellTokenIds) external returns(uint matchCount) {
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
    // orders are encoded as [id, maker, addedTime, price, amount]
    function getActiveBuyOrders(uint offset) external view returns (uint[5][CHUNK_SIZE] response) {
        for (uint8 i = 0; i < CHUNK_SIZE && i + offset < activeBuyOrders.length; i++) {
            uint orderId = activeBuyOrders[offset + i];
            Order storage order = buyTokenOrders[orderId];
            response[i] = [orderId, uint(order.maker), order.addedTime, order.price, order.amount];
        }
    }

    function getActiveSellOrders(uint offset) external view returns (uint[5][CHUNK_SIZE] response) {
        for (uint8 i = 0; i < CHUNK_SIZE && i + offset < activeSellOrders.length; i++) {
            uint orderId = activeSellOrders[offset + i];
            Order storage order = sellTokenOrders[orderId];
            response[i] = [orderId, uint(order.maker), order.addedTime, order.price, order.amount];
        }
    }

    /* place sell token order called from AugmintToken's transferAndNotify
     Flow:
        1) user calls token contract's transferAndNotify price passed in data arg
        2) transferAndNotify transfers tokens to the Exchange contract
        3) transferAndNotify calls Exchange.transferNotification with lockProductId
    */
    function transferNotification(address maker, uint tokenAmount, uint price) public {
        require(msg.sender == address(augmintToken));
        _placeSellTokenOrder(maker, price, tokenAmount);
    }

    function _fillOrder(uint buyTokenId, uint sellTokenId) private {
        Order storage buy = buyTokenOrders[buyTokenId];
        Order storage sell = sellTokenOrders[sellTokenId];

        require(buy.price >= sell.price);

        // meet in the middle
        uint price = buy.price.add(sell.price).div(2);

        uint sellWei = sell.amount.mul(1 ether).div(price);

        uint tradedWei;
        uint tradedTokens;
        if (sellWei <= buy.amount) {
            tradedWei = sellWei;
            tradedTokens = sell.amount;
        } else {
            tradedWei = buy.amount;
            tradedTokens = buy.amount.mul(price).div(1 ether);
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

        OrderFill(buy.maker, sell.maker, buyTokenId,
            sellTokenId, price, tradedWei, tradedTokens);
    }


    function _placeSellTokenOrder(address maker, uint price, uint tokenAmount)
    private returns (uint orderId) {
        require(price > 0);
        require(tokenAmount > 0);

        orderId = sellTokenOrders.push(Order(activeSellOrders.length, maker, now, price, tokenAmount)) - 1;
        activeSellOrders.push(orderId);

        NewOrder(orderId, maker, price, tokenAmount, 0);
    }

    function _removeBuyOrder(Order storage order) private {
        _removeOrder(activeBuyOrders, order.index);
    }

    function _removeSellOrder(Order storage order) private {
        _removeOrder(activeSellOrders, order.index);
    }

    function _removeOrder(uint[] storage orders, uint index) private {
        if (index < orders.length - 1) {
            orders[index] = orders[orders.length - 1];
        }
        orders.length--;
    }

}
