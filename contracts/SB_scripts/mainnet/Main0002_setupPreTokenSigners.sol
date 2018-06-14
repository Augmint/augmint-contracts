/* script to add preToken Signers and remove deployer account as signer
    must be executed via PreTokenProxy
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../PreTokenProxy.sol";


contract Main0002_setupPreTokenSigners {

    PreTokenProxy constant
            preTokenProxy = PreTokenProxy(0x1411b3B189B01f6e6d1eA883bFFcbD3a5224934C);

    function execute(Main0002_setupPreTokenSigners /* self (not used) */) external {
        /******************************************************************************
         * Set up PretokenSigners
         ******************************************************************************/

        address[] memory signersToAdd = new address[](2); // dynamic array needed for addSigners() & removeSigners()
        signersToAdd[0] = 0xf9ea0E2857405C859bb8647ECB11f931D1259753;
        signersToAdd[1] = 0xd8203A652452906586F2E6cB6e31f6f7fed094D4;
        preTokenProxy.addSigners(signersToAdd);

        // revoke deployer account signer rights
        address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
        signersToRemove[0] = 0x7b534c2D0F9Ee973e0b6FE8D4000cA711A20f22e;
        preTokenProxy.removeSigners(signersToRemove);
    }

}
