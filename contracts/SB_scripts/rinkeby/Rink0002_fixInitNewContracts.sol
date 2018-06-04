/* Revoke unecessary permission granted in Rink0001_initNewContracts.sol  */

pragma solidity 0.4.24;

import "../../FeeAccount.sol";


contract Rink0002_fixInitNewContracts {

    address constant stabilityBoardSignerAddress = 0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB;
    address constant oldToken3 = 0x135893F1A6B3037BB45182841f18F69327366992;
    address constant oldToken4 = 0x6C90c10D7A33815C2BaeeD66eE8b848F1D95268e;

    FeeAccount constant feeAccount = FeeAccount(0x9B26f801C6078B76690b0D954f7fD662e04BE1d1);

    function execute(Rink0002_fixInitNewContracts /* self, not used */) external {
        // called via StabilityBoardSignerContract
        require(address(this) == stabilityBoardSignerAddress, "only execute via stabilityboardsigner");

        /* revoke unecessary permission granted by Rink0001_initNewContracts.sol
        NB: make sure this mistake is not carried over to future migrations */
        feeAccount.revokePermission(oldToken3, "NoFeeTransferContracts");
        feeAccount.revokePermission(oldToken4, "NoFeeTransferContracts");

    }

}
