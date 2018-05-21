/*
 *  receiver contract interface
 * see https://github.com/ethereum/EIPs/issues/677
 */
pragma solidity 0.4.24;


interface TokenReceiver {
    function transferNotification(address from, uint256 amount, uint data) external;
}
