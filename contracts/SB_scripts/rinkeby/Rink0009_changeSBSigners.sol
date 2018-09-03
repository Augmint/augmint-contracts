/* revoke Krosza and add Treer as StabilityBoard signer on rinkeby for faster testing */

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../StabilityBoardProxy.sol";


contract Rink0009_changeSBSigners {
    address constant TREER_ADDRESS = 0x1A5F89a7E641e02922dbdc6490c47909deCEe592;
    address constant KROSZA_ADDRESS = 0x14A9dc091053fCbA9474c5734078238ff9904364;
    address constant INCORRECT_SCRIPT = 0x17913EBe915349caACBE9192Bfd5aB3D45839E1a;

    StabilityBoardProxy constant
                    stabilityBoardProxy = StabilityBoardProxy(0x44022C28766652EC5901790E53CEd7A79a19c10A);

    function execute(Rink0009_changeSBSigners /* self, not used */) external {

        // cancel same script deployed but with incorrect address for TREER. (sogned but not executed yet)
        stabilityBoardProxy.cancelScript(INCORRECT_SCRIPT);

        /******************************************************************************
         * Add Treer as StabilityBoard Signers
         ******************************************************************************/
         address[] memory signersToAdd = new address[](1); // dynamic array needed for addSigners() & removeSigners()
         signersToAdd[0] = TREER_ADDRESS;
         stabilityBoardProxy.addSigners(signersToAdd);

         // revoke SZERT so we 2 from 3 is enough to sign
         address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
         signersToRemove[0] = KROSZA_ADDRESS;
         stabilityBoardProxy.removeSigners(signersToRemove);
    }

}
