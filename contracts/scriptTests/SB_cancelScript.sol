/* script to cancel a multiSig script - one instance  can be executed by StabilityBoardSigner only once
  primarily for tests because for live using const for script addresses is cheaper & more efficient
*/

pragma solidity 0.4.24;

import "../generic/MultiSig.sol";


contract SB_cancelScript {
    address public scriptToCancelAddress;

    constructor(address _scriptToCancelAddress) public {
        scriptToCancelAddress = _scriptToCancelAddress;
    }

    function getScriptToCancelAddress() public view returns (address) {
        // solidity got confused with generated getter in execute
        return scriptToCancelAddress;
    }

    function execute(SB_cancelScript self) external {
        MultiSig multiSig = MultiSig(address(this));
        multiSig.cancelScript(self.getScriptToCancelAddress());
    }

}
