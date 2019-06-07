/* test script to simulate revert() in script execute() to multiSig
*/

pragma solidity 0.4.24;


contract SB_revertingNoReasonScript {

    function execute(SB_revertingNoReasonScript self) pure external {
        require(address(self) != 0, "just to silence unused var compiler warning");
        // solium-disable-next-line error-reason
        revert();
    }

}
