/* Augmint's Internal Exchange

  For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/exchangeFlow.png

    TODO:
        - change to wihtdrawal pattern, see: https://github.com/Augmint/augmint-contracts/issues/17
        - deduct fee
        - consider take funcs (frequent rate changes with takeBuyToken? send more and send back remainder?)
        - use Rates interface?
*/
pragma solidity 0.4.24;

import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./Rates.sol";


contract Exchange is Restricted {
    using SafeMath for uint256;

    AugmintTokenInterface public augmintToken;
    Rates public rates;

    uint public constant CHUNK_SIZE = 100;

    struct Order {
        uint64 index;
        address maker;

        // % of published current peggedSymbol/ETH rates published by Rates contract. Stored as parts per million
        // I.e. 1,000,000 = 100% (parity), 990,000 = 1% below parity
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

    event NewOrder(uint64 indexed orderId, address indexed maker, uint32 price, uint tokenAmount, uint weiAmount);

    event OrderFill(address indexed tokenBuyer, address indexed tokenSeller, uint64 buyTokenOrderId,
        uint64 sellTokenOrderId, uint publishedRate, uint32 price, uint fillRate, uint weiAmount, uint tokenAmount);

    event CancelledOrder(uint64 indexed orderId, address indexed maker, uint tokenAmount, uint weiAmount);

    event RatesContractChanged(Rates newRatesContract);

    constructor(AugmintTokenInterface _augmintToken, Rates _rates) public {
        augmintToken = _augmintToken;
        rates = _rates;
    }

    /* to allow upgrade of Rates  contract */
    function setRatesContract(Rates newRatesContract)
    external restrict("StabilityBoardSignerContract") {
        rates = newRatesContract;
        emit RatesContractChanged(newRatesContract);
    }

    function placeBuyTokenOrder(uint32 price) external payable returns (uint64 orderId) {
        require(price > 0, "price must be > 0");
        require(msg.value > 0, "msg.value must be > 0");

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
        require(msg.sender == address(augmintToken), "msg.sender must be augmintToken");
        _placeSellTokenOrder(maker, uint32(price), tokenAmount);
    }

    function cancelBuyTokenOrder(uint64 buyTokenId) external {
        Order storage order = buyTokenOrders[buyTokenId];
        require(order.maker == msg.sender, "msg.sender must be order.maker");
        require(order.amount > 0, "buy order already removed");

        uint amount = order.amount;
        order.amount = 0;
        _removeBuyOrder(order);

        msg.sender.transfer(amount);

        emit CancelledOrder(buyTokenId, msg.sender, 0, amount);
    }

    function cancelSellTokenOrder(uint64 sellTokenId) external {
        Order storage order = sellTokenOrders[sellTokenId];
        require(order.maker == msg.sender, "msg.sender must be order.maker");
        require(order.amount > 0, "sell order already removed");

        uint amount = order.amount;
        order.amount = 0;
        _removeSellOrder(order);

        augmintToken.transferWithNarrative(msg.sender, amount, "Sell token order cancelled");

        emit CancelledOrder(sellTokenId, msg.sender, amount, 0);
    }

    /* matches any two orders if the sell price >= buy price
        trade price is the price of the maker (the order placed earlier)
        reverts if any of the orders have been removed
    */
    function matchOrders(uint64 buyTokenId, uint64 sellTokenId) external {
        require(_fillOrder(buyTokenId, sellTokenId), "fill order failed");
    }

    /*  matches as many orders as possible from the passed orders
        Runs as long as gas is available for the call.
        Reverts if any match is invalid (e.g sell price > buy price)
        Skips match if any of the matched orders is removed / already filled (i.e. amount = 0)
    */
    function matchMultipleOrders(uint64[] buyTokenIds, uint64[] sellTokenIds) external returns(uint matchCount) {
        uint len = buyTokenIds.length;
        require(len == sellTokenIds.length, "buyTokenIds and sellTokenIds lengths must be equal");

        for (uint i = 0; i < len && gasleft() > ORDER_MATCH_WORST_GAS; i++) {
            if(_fillOrder(buyTokenIds[i], sellTokenIds[i])) {
                matchCount++;
            }
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

    function _fillOrder(uint64 buyTokenId, uint64 sellTokenId) private returns(bool success) {
        Order storage buy = buyTokenOrders[buyTokenId];
        Order storage sell = sellTokenOrders[sellTokenId];
        if( buy.amount == 0 || sell.amount == 0 ) {
            return false; // one order is already filled and removed.
                          // we let matchMultiple continue, indivudal match will revert
        }

        require(buy.price >= sell.price, "buy price must be >= sell price");

        // pick maker's price (whoever placed order sooner considered as maker)
        uint32 price = buyTokenId > sellTokenId ? sell.price : buy.price;

        uint publishedRate;
        (publishedRate, ) = rates.rates(augmintToken.peggedSymbol());
        uint fillRate = publishedRate.mul(price).roundedDiv(1000000);

        uint sellWei = sell.amount.mul(1 ether).roundedDiv(fillRate);

        uint tradedWei;
        uint tradedTokens;
        if (sellWei <= buy.amount) {
            tradedWei = sellWei;
            tradedTokens = sell.amount;
        } else {
            tradedWei = buy.amount;
            tradedTokens = buy.amount.mul(fillRate).roundedDiv(1 ether);
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
            sellTokenId, publishedRate, price, fillRate, tradedWei, tradedTokens);

        return true;
    }

    function _placeSellTokenOrder(address maker, uint32 price, uint tokenAmount)
    private returns (uint64 orderId) {
        require(price > 0, "price must be > 0");
        require(tokenAmount > 0, "tokenAmount must be > 0");

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
