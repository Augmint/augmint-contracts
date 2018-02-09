/* Augmint's internal Exchange
    TODO: check/test if underflow possible on sell/buyORder.amount -= token/weiAmount in matchOrders()
    TODO: deduct fee
    TODO: consider take funcs (frequent rate changes with takeBuyToken? send more and send back remainder?)
*/
pragma solidity 0.4.19;
import "./interfaces/ExchangeInterface.sol";


contract Exchange is ExchangeInterface {

    uint public constant CHUNK_SIZE = 100;

    uint[] private activeBuyOrders;
    uint[] private activeSellOrders;

    uint public minOrderAmount; // 0: no limit. For placeBuyTokenOrder it's calculated on current rate & price provided

    /* used to stop executing matchMultiple when running out of gas.
        actual is much less, just leaving enough matchMultipleOrders() to finish TODO: fine tune & test it*/
    uint32 public constant ORDER_MATCH_WORST_GAS = 200000;

    event NewOrder(uint indexed orderId, address indexed maker, uint price, uint tokenAmount,
        uint weiAmount);

    event OrderFill(address indexed tokenBuyer, address indexed tokenSeller, uint buyTokenOrderId,
        uint sellTokenOrderId, uint price, uint weiAmount, uint tokenAmount);

    event CancelledOrder(uint indexed orderId, address indexed maker, uint tokenAmount, uint weiAmount);

    event MinOrderAmountChanged(uint newMinOrderAmount);

    function Exchange(address augmintTokenAddress, address ratesAddress, uint _minOrderAmount) public {
        augmintToken = AugmintTokenInterface(augmintTokenAddress);
        rates = Rates(ratesAddress);
        minOrderAmount = _minOrderAmount;
    }

    function placeBuyTokenOrder(uint price) external payable returns (uint orderId) {
        require(price > 0);
        require(msg.value > 0);

        uint tokenAmount = rates.convertFromWei(augmintToken.peggedSymbol(), msg.value.roundedDiv(price).mul(10000));
        require(tokenAmount >= minOrderAmount);

        orderId = buyTokenOrders.push(Order(activeBuyOrders.length, msg.sender, now, price, msg.value)) - 1;
        activeBuyOrders.push(orderId);

        NewOrder(orderId, msg.sender, price, 0, msg.value);
    }

    /* this function requires previous approval to transfer tokens */
    function placeSellTokenOrder(uint price, uint tokenAmount) external returns (uint orderId) {
        augmintToken.transferFromNoFee(msg.sender, this, tokenAmount, "Sell token order placed");
        return _placeSellTokenOrder(msg.sender, price, tokenAmount);
    }

    /* This func assuming that token already transferred to Exchange so it can be only called
        via AugmintToken.placeSellTokenOrderOnExchange() convenience function */
    function placeSellTokenOrderTrusted(address maker, uint price, uint tokenAmount)
    external returns (uint orderId) {
        require(msg.sender == address(augmintToken));
        return _placeSellTokenOrder(maker, price, tokenAmount);
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

        augmintToken.transferNoFee(msg.sender, amount, "Sell token order cancelled");

        CancelledOrder(sellTokenId, msg.sender, amount, 0);
    }

    /* matches any two orders if the sell price >= buy price
        trade price is the price which is closer to par.
        reverts if any of the orders been removed
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

    /* only allowed for Monetary Board. */
    function setMinOrderAmount(uint _minOrderAmount) external restrict("MonetaryBoard") {
        minOrderAmount = _minOrderAmount;
        MinOrderAmountChanged(minOrderAmount);
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

    function _fillOrder(uint buyTokenId, uint sellTokenId) private {
        Order storage buyTokenOrder = buyTokenOrders[buyTokenId];
        Order storage sellTokenOrder = sellTokenOrders[sellTokenId];

        require(buyTokenOrders[buyTokenId].price >= sellTokenOrders[sellTokenId].price);

        uint price = getMatchPrice(buyTokenOrder.price, sellTokenOrder.price); // use price which is closer to par
        uint sellTokenWeiAmount = rates.convertToWei(augmintToken.peggedSymbol(),
                                    sellTokenOrder.amount.mul(price)).roundedDiv(10000);
        uint tradedWeiAmount;
        uint tradedTokenAmount;

        if (sellTokenWeiAmount <= buyTokenOrder.amount) {
            tradedWeiAmount = sellTokenWeiAmount;
            tradedTokenAmount = sellTokenOrder.amount;
        } else {
            tradedWeiAmount = buyTokenOrder.amount;
            tradedTokenAmount = rates.convertFromWei(augmintToken.peggedSymbol(),
                                                        buyTokenOrder.amount.roundedDiv(price).mul(10000));
        }

        buyTokenOrder.amount -= tradedWeiAmount;
        if (buyTokenOrder.amount == 0) {
            _removeBuyOrder(buyTokenOrder);
        }

        sellTokenOrder.amount -= tradedTokenAmount;
        if (sellTokenOrder.amount == 0) {
            _removeSellOrder(sellTokenOrder);
        }

        sellTokenOrder.maker.transfer(tradedWeiAmount);
        augmintToken.transferNoFee(buyTokenOrder.maker, tradedTokenAmount, "Buy token order fill");

        OrderFill(buyTokenOrder.maker, sellTokenOrder.maker, buyTokenId,
            sellTokenId, price, tradedWeiAmount, tradedTokenAmount);
    }

    // return par if it's between par otherwise the price which is closer to par
    function getMatchPrice(uint buyPrice, uint sellPrice) private pure returns(uint price) {
        if (sellPrice <= 10000 && buyPrice >= 10000) {
            price = 10000;
        } else {
            uint sellPriceDeviationFromPar = sellPrice > 10000 ? sellPrice - 10000 : 10000 - sellPrice;
            uint buyPriceDeviationFromPar = buyPrice > 10000 ? buyPrice - 10000 : 10000 - buyPrice;
            price = sellPriceDeviationFromPar > buyPriceDeviationFromPar ? buyPrice : sellPrice;
        }
        return price;
    }

    function _placeSellTokenOrder(address maker, uint price, uint tokenAmount)
    private returns (uint orderId) {
        require(price > 0);
        require(tokenAmount > 0);
        require(tokenAmount >= minOrderAmount);
        require(rates.convertToWei(augmintToken.peggedSymbol(), tokenAmount) > 0);

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
