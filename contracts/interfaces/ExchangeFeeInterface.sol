/*
 *  exchange fee calculation  interface (not used yet)
 */
pragma solidity 0.4.21;


interface ExchangeFeeInterface {
    function calculateExchangeFee(uint weiAmount) external view returns (uint256 weiFee);
}
