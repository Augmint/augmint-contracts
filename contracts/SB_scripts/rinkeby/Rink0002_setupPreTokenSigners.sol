/* script to add preToken Signers and remove deployer account as signer
    must be executed via PreTokenProxy
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../PreTokenProxy.sol";


contract Rink0002_setupPreTokenSigners {
    address constant SZERT_ADDRESS = 0x9aaf197F25d207ecE17DfBeb20780095f7623A23;
    address constant KROSZA_ADDRESS = 0x14A9dc091053fCbA9474c5734078238ff9904364;

    address constant DEPLOYER_ADDRESS = 0xae653250B4220835050B75D3bC91433246903A95;

    PreTokenProxy constant
            preTokenProxy = PreTokenProxy(0x0775465245e523b45Cc3b41477d44F908e22feDE);

    function execute(Rink0002_setupPreTokenSigners /* self (not used) */) external {
        /******************************************************************************
         * Set up PretokenSigners
         ******************************************************************************/

        address[] memory signersToAdd = new address[](2); // dynamic array needed for addSigners() & removeSigners()
        signersToAdd[0] = SZERT_ADDRESS;
        signersToAdd[1] = KROSZA_ADDRESS;
        preTokenProxy.addSigners(signersToAdd);

        // revoke deployer account signer rights
        address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
        signersToRemove[0] = DEPLOYER_ADDRESS;
        preTokenProxy.removeSigners(signersToRemove);
    }

}
