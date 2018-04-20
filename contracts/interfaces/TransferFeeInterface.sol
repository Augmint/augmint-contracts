/*
 *  transfer fee calculation interface
 *
 */
pragma solidity ^0.4.23;


interface TransferFeeInterface {
    function calculateTransferFee(address from, address to, uint amount) external view returns (uint256 fee);
}
