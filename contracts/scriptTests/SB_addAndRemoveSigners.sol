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

    // workaround because we can't create dynamic array in execute and addSigners / removeSigners args are dynamic
    address[] signersToRemove;
    address[] signersToAdd;

    // getters needed because we can't access state from execute because it's called from Multisig via delegatacall()
    function getSignersToAdd() public view returns (address[]) {
        return signersToAdd;
    }

    function getSignersToRemove() public view returns (address[]) {
        return signersToRemove;
    }

    constructor() public {
        signersToAdd.push(ACC1);
        signersToAdd.push(ACC2);
        signersToRemove.push(ACC0);
    }

    function execute(SB_addAndRemoveSigners self) external {
        StabilityBoardProxy multiSig = StabilityBoardProxy(address(this));
        multiSig.addSigners(self.getSignersToAdd());
        multiSig.removeSigners(self.getSignersToRemove());
    }

}
