/* Set up new Exchange contract with required permissions */

pragma solidity 0.4.24;

import "../../FeeAccount.sol";
import "../../Exchange.sol";


contract Main0013_initNewExchange {
    address constant stabilityBoardProxyAddress = 0x4686f017D456331ed2C1de66e134D8d05B24413D;

    FeeAccount constant feeAccount = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    Exchange constant newExchange = Exchange(0xaFEA54baDf7A68F93C2235B5F4cC8F02a2b55Edd);

    function execute(Main0013_initNewExchange /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == stabilityBoardProxyAddress, "execute only via StabilityBoardProxy");

        /******************************************************************************
         * Set up permissions
         ******************************************************************************/
        // StabilityBoard
        newExchange.grantPermission(stabilityBoardProxyAddress, "StabilityBoard");

        // set NoTransferFee permissions
        feeAccount.grantPermission(address(newExchange), "NoTransferFee");

    }

}
