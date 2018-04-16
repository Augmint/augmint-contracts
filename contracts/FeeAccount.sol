/* Contract to collect fees from system */

pragma solidity 0.4.21;
import "./generic/SystemAccount.sol";


contract FeeAccount is SystemAccount { // solhint-disable-line no-empty-blocks
    function () public payable { // solhint-disable-line no-empty-blocks
        // to accept ETH sent into feeAccount (defaulting fee in ETH )
    }
}
