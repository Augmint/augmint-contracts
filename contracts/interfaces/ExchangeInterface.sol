/* Interface for Augmint's internal Exchange
    TODO: rates setter?
    TODO: make a rates interface and use it instead?
    TODO: uint32 for now?
    TODO: do we need all funcs or just orders + placeSellTokenOrderTrusted  here?
*/
pragma solidity 0.4.19;
import "../generic/SafeMath.sol";
import "../generic/Restricted.sol";
import "./AugmintTokenInterface.sol";
import "../Rates.sol";


contract ExchangeInterface is Restricted {
    using SafeMath for uint256;
    AugmintTokenInterface public augmintToken;
    Rates public rates;

    struct Order {
        uint index;
        address maker;
        uint addedTime;
        uint price;
        uint amount; // buy token: amount in wei sell token: token amount with 4 decimals
    }

    Order[] public buyTokenOrders;
    Order[] public sellTokenOrders;

    function placeBuyTokenOrder(uint price) external payable returns (uint orderId);

    function placeSellTokenOrder(uint price, uint tokenAmount)
        external returns (uint orderId);

    function placeSellTokenOrderTrusted(address maker, uint price, uint tokenAmount)
        external returns (uint orderId);

    function cancelSellTokenOrder(uint sellTokenOrderId) external;
    function cancelBuyTokenOrder(uint buyTokenOrderId) external;

    function matchMultipleOrders(uint[] buyTokenIds, uint[] sellTokenIds)
        external returns(uint matchCount);

    function matchOrders(uint buyTokenOrderId, uint sellTokenOrderId)
        external;

}
