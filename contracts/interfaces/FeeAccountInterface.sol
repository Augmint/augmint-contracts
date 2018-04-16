/*
 *  fee Account contract interface
 *
 */
pragma solidity 0.4.21;


interface FeeAccountInterface {
    function calculateTransferFee(address from, address to, uint amount) external view returns (uint256 fee);
    function calculateExchangeFee(uint weiAmount) external view returns (uint256 weiFee);
}
