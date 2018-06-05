/* script to add signers to multiSig - one instance  can be executed by StabilityBoardSigner only once
  primarily for tests because for live using const for signer addresses is cheaper & more efficient
*/

pragma solidity 0.4.24;

import "../generic/AugmintToken.sol";
import "../generic/MultiSig.sol";


contract SB_addSigners {
    address[] private newSigners;

    constructor(address[] _newSigners) public {
        newSigners = _newSigners;
    }

    function getSigners() public view returns (address[]) {
        // solidity got confused with generated getter in execute
        return newSigners;
    }

    function execute(SB_addSigners self) external {
        MultiSig multiSig = MultiSig(address(this));
        multiSig.addSigners(self.getSigners());
    }

}
