/* Set up new Exchange contract with required permissions */

pragma solidity 0.4.24;

import "../../FeeAccount.sol";
import "../../Exchange.sol";


contract Rink0012_initNewExchange {
    address constant stabilityBoardProxyAddress = 0x44022C28766652EC5901790E53CEd7A79a19c10A;

    FeeAccount constant feeAccount = FeeAccount(0x0F5983a6d760BF6E385339af0e67e87420d413EC);
    Exchange constant newExchange = Exchange(0x554817688D096ae89fDacCf52E76f629B9Db8f53);

    function execute(Rink0012_initNewExchange /* self, not used */) external {
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