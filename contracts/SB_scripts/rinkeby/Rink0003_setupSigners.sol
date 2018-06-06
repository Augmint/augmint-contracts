/* script to add preToken and StabilityBoard Signers and remove deployer account as signer */

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../PreTokenProxy.sol";
import "../../StabilityBoardSigner.sol";


contract Rink0003_setupSigners {
    address constant SZERT_ADDRESS = 0x9aaf197F25d207ecE17DfBeb20780095f7623A23;
    address constant KROSZA_ADDRESS = 0x14A9dc091053fCbA9474c5734078238ff9904364;
    address constant PHRAKTLE_ADDRESS = 0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87;

    address constant DEPLOYER_ADDRESS = 0xae653250B4220835050B75D3bC91433246903A95;

    PreTokenProxy constant
            preTokenProxy = PreTokenProxy(0x43732139403ff83f41A6eBfA58C4Ed3D684Cb3d9);
    StabilityBoardSigner constant
                    stabilityBoardSigner = StabilityBoardSigner(0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB);

    // dynamic array needed for addSigners() & grantMultiplePermissions() populated in constructor
    address[] preTokenSignersToAdd;
    address[] SBSignersToAdd;
    address[] signersToRemove;

    constructor() public {
        preTokenSignersToAdd.push(SZERT_ADDRESS);
        preTokenSignersToAdd.push(KROSZA_ADDRESS);

        SBSignersToAdd.push(SZERT_ADDRESS);
        SBSignersToAdd.push(KROSZA_ADDRESS);
        SBSignersToAdd.push(PHRAKTLE_ADDRESS);

        signersToRemove.push(DEPLOYER_ADDRESS);
    }

    function execute(Rink0003_setupSigners /* self, not used */) external {
        /******************************************************************************
         * Set up PretokenSigners
         ******************************************************************************/
        preTokenProxy.addSigners(preTokenSignersToAdd);
        preTokenProxy.removeSigners(signersToRemove);

        /******************************************************************************
         * Set up StabilityBoard Signers
         ******************************************************************************/
        stabilityBoardSigner.addSigners(SBSignersToAdd);
        stabilityBoardSigner.removeSigners(signersToRemove);

    }

}
