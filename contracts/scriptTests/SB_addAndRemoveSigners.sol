/* script to remove signers from multiSig - one instance can be executed by StabilityBoardProxy only once
    primarily for tests because for live using const for signer addresses is cheaper & more efficient
 */

pragma solidity 0.4.24;

import "../generic/AugmintToken.sol";
import "../generic/MultiSig.sol";
import "../StabilityBoardProxy.sol";


contract SB_addAndRemoveSigners {
    address constant ACC0 = 0x76E7a0aEc3E43211395bBBB6Fa059bD6750F83c3;
    address constant ACC1 = 0x5e09B21cCF42c1c30ca9C1C8D993d922E7c0d036;
    address constant ACC2 = 0x90993Fd3AC7c150ce24eb59a0AD2AaE8De1a84d8;

    function execute(SB_addAndRemoveSigners /* self (not used) */) external {
        StabilityBoardProxy multiSig = StabilityBoardProxy(address(this));

        address[] memory signersToAdd = new address[](2); // dynamic array needed for addSigners() & removeSigners()
        signersToAdd[0] = ACC1;
        signersToAdd[1] = ACC2;
        multiSig.addSigners(signersToAdd);

        // revoke deployer account signer rights
        address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
        signersToRemove[0] = ACC0;
        multiSig.removeSigners(signersToRemove);
    }

}
