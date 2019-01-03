/* Remove deployer account from mainnet signers */

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../StabilityBoardProxy.sol";

contract Main0020_removeSigner {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    function execute(Main0020_removeSigner /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

         // revoke deployer account signer rights
         address[] memory signersToRemove = new address[](1); // dynamic array needed for addSigners() & removeSigners()
         signersToRemove[0] = 0x23445fFDDA92567a4c6168D376C35d93AcB96e01;   // treer deployer account
         STABILITY_BOARD_PROXY.removeSigners(signersToRemove);
    }
}