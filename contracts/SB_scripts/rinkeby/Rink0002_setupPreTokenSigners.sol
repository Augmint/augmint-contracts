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
            preTokenProxy = PreTokenProxy(0x43732139403ff83f41A6eBfA58C4Ed3D684Cb3d9);

    // dynamic array needed for addSigners() & removeSigners(), populated in constructor
    address[] preTokenSignersToAdd;
    address[] signersToRemove;

    constructor() public {
        preTokenSignersToAdd.push(SZERT_ADDRESS);
        preTokenSignersToAdd.push(KROSZA_ADDRESS);

        signersToRemove.push(DEPLOYER_ADDRESS);
    }

    // getters needed because we can't access state from execute because it's called from Multisig via delegatacall()
    function getPreTokenSignersToAdd() public view returns (address[]) {
        return preTokenSignersToAdd;
    }

    function getSignersToRemove() public view returns (address[]) {
        return signersToRemove;
    }

    function execute(Rink0002_setupPreTokenSigners self) external {
        /******************************************************************************
         * Set up PretokenSigners
         ******************************************************************************/
        preTokenProxy.addSigners(self.getPreTokenSignersToAdd());
        preTokenProxy.removeSigners(self.getSignersToRemove());
    }

}
