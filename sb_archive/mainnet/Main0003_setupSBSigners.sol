/* script to add  StabilityBoard Signers and remove deployer account as signer
    must be executed via StabilityBoardProxy
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../StabilityBoardProxy.sol";


contract Main0003_setupSBSigners {

    StabilityBoardProxy constant
                    stabilityBoardProxy = StabilityBoardProxy(0x4686f017D456331ed2C1de66e134D8d05B24413D);

    function execute(Main0003_setupSBSigners /* self (not used)*/ ) external {
        /******************************************************************************
         * Set up StabilityBoard Signers
         ******************************************************************************/
         address[] memory signersToAdd = new address[](3); // dynamic array needed for addSigners() & removeSigners()
         signersToAdd[0] = 0x9de3F6E7caCbb7e1c2489dFCe21abbB0ecEE6213;
         signersToAdd[1] = 0xAE162e28575Ba898dc08D283f2Be10AE8b4114A2;
         signersToAdd[2] = 0x53DBF6E8fe46307C7536eAbb0D90CADA3e732716;
         stabilityBoardProxy.addSigners(signersToAdd);

         // revoke deployer account signer rights
         address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
         signersToRemove[0] = 0x7b534c2D0F9Ee973e0b6FE8D4000cA711A20f22e;
         stabilityBoardProxy.removeSigners(signersToRemove);
    }

}
