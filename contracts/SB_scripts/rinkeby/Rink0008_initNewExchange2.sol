/* Rink0007 failed, next attempt with the same code but as contract instead of library.
Set up new Exchange contract with required permissions */

pragma solidity 0.4.24;

import "../../FeeAccount.sol";
import "../../Exchange.sol";


contract Rink0008_initNewExchange2 {
    address constant stabilityBoardProxyAddress = 0x44022C28766652EC5901790E53CEd7A79a19c10A;

    FeeAccount constant feeAccount = FeeAccount(0x0F5983a6d760BF6E385339af0e67e87420d413EC);
    Exchange constant newExchange = Exchange(0x5C35162DBf91C794F1569C5fe1649f0c5283d2f6);

    function execute(Rink0008_initNewExchange2 /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == stabilityBoardProxyAddress, "only deploy via stabilityboardsigner");

        /******************************************************************************
         * Set up permissions
         ******************************************************************************/
        // StabilityBoard
        newExchange.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");

        // set NoTransferFee permissions
        feeAccount.grantPermission(address(newExchange), "NoTransferFee");

    }

}
