/* Set up new Exchange contract with required permissions
  This script was deployed (https://etherscan.io/tx/0xd30b171aa8f173917a4961674fc4381cc9746584cfaf55fa410c707a63380f1a)
   but failed to  execute (txhash: https://etherscan.io/tx/0xab0360a669377015324c9e0ac360bd48dbaf6d3e596c5ff8bcf785aa41c2a73f )
  because of exchange deploy script didn't pass addresses to constructor
   as string so Exchange had incorrect initial addresses set up.
  An identical init script will be created for a new Exchange contract deployment.

*/

pragma solidity 0.4.24;

import "../../FeeAccount.sol";
import "../../Exchange.sol";


contract Main0008_initNewExchange {
    address constant stabilityBoardProxyAddress = 0x4686f017D456331ed2C1de66e134D8d05B24413D;

    FeeAccount constant feeAccount = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    Exchange constant newExchange = Exchange(0x60830798cF0fd79cC05C8CE09CBC1ebc3f82Ea3f);

    function execute(Main0008_initNewExchange /* self, not used */) external {
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
