/* test script to simulate revert() in script execute() to multiSig
*/

pragma solidity 0.4.24;


contract SB_revertingScript {

    function execute(SB_revertingScript self) pure external {
        require(address(self) != 0, "just to silence unused var compiler warning");
        revert("intentional revert for test");
    }

}
