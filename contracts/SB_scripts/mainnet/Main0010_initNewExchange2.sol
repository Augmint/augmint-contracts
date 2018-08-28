/* Set up new Exchange contract (deployed at mainnet_migrations/24_deploy_newExchange2.js) with required permissions
  This init script ran on a second, fixed redeploy of the same exchange with correct constructor params
  (prev Exchange deploy at 21_deploy_newExchange was incorrect so  Main0008_initNewExchange failed)
*/

pragma solidity 0.4.24;

import "../../FeeAccount.sol";
import "../../Exchange.sol";


contract Main0010_initNewExchange2 {
    address constant stabilityBoardProxyAddress = 0x4686f017D456331ed2C1de66e134D8d05B24413D;

    FeeAccount constant feeAccount = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    Exchange constant newExchange = Exchange(0xEAe7D30bCD44F27d58985b56ADD007FceE254AbD);

    function execute(Main0010_initNewExchange2 /* self, not used */) external {
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
