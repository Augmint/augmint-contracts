/* setup StabilityBoard signers in new StabilityBoardProxy on Rinkeby */

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../StabilityBoardProxy.sol";


contract Rink0016_setupSBSigners {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x64A31038dfD0a085A51C8695329680564Cb19c0a);

    function execute(Rink0016_setupSBSigners /* self, not used */) external {
        address[] memory signersToAdd = new address[](2); // dynamic array needed for addSigners() & removeSigners()
        signersToAdd[0] = 0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87;
        signersToAdd[1] = 0x9aaf197F25d207ecE17DfBeb20780095f7623A23;
        STABILITY_BOARD_PROXY.addSigners(signersToAdd);
    }
}
