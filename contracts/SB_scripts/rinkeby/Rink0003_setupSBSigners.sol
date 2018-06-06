/* script to add  StabilityBoard Signers and remove deployer account as signer
    must be executed via StabilityBoardProxy
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../StabilityBoardProxy.sol";


contract Rink0003_setupSBSigners {
    address constant SZERT_ADDRESS = 0x9aaf197F25d207ecE17DfBeb20780095f7623A23;
    address constant KROSZA_ADDRESS = 0x14A9dc091053fCbA9474c5734078238ff9904364;
    address constant PHRAKTLE_ADDRESS = 0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87;

    address constant DEPLOYER_ADDRESS = 0xae653250B4220835050B75D3bC91433246903A95;

    StabilityBoardProxy constant
                    stabilityBoardProxy = StabilityBoardProxy(0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB);

    function execute(Rink0003_setupSBSigners /* self (not used)*/ ) external {
        /******************************************************************************
         * Set up StabilityBoard Signers
         ******************************************************************************/
         address[] memory signersToAdd = new address[](3); // dynamic array needed for addSigners() & removeSigners()
         signersToAdd[0] = SZERT_ADDRESS;
         signersToAdd[1] = KROSZA_ADDRESS;
         signersToAdd[2] = PHRAKTLE_ADDRESS;
         stabilityBoardProxy.addSigners(signersToAdd);

         // revoke deployer account signer rights
         address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
         signersToRemove[0] = DEPLOYER_ADDRESS;
         stabilityBoardProxy.removeSigners(signersToRemove);
    }

}
