/* test script to simulate script execute() running out of gas
  execute requires 290k+ gas, set gasLimit below for testing
*/

pragma solidity 0.4.24;

import "../generic/MultiSig.sol";


contract SB_outOfGasScript {
    address[] dummy;

    function execute(SB_outOfGasScript self) external {
        require(address(self) != 0, "just to silence unused var compiler warning");
        MultiSig multiSig = MultiSig(address(this));
        dummy.push(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa);
        dummy.push(0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB);
        dummy.push(0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC);
        multiSig.addSigners(dummy);
    }

}
