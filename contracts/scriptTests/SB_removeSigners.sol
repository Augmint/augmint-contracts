/* script to remove signers from multiSig - one instance can be executed by StabilityBoardProxy only once
    primarily for tests because for live using const for signer addresses is cheaper & more efficient
 */

pragma solidity 0.4.24;

import "../generic/AugmintToken.sol";
import "../generic/MultiSig.sol";


contract SB_removeSigners {
    address[] private removeSigners;

    constructor(address[] _removeSigners) public {
        removeSigners = _removeSigners;
    }

    function getRemoveSigners() public view returns (address[]) {
        return removeSigners;
    }

    function execute(SB_removeSigners self) external {
        MultiSig multiSig = MultiSig(address(this));
        multiSig.removeSigners(self.getRemoveSigners());
    }

}
