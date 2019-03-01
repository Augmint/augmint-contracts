/* Change allowedDifferenceAmount */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../MonetarySupervisor.sol";

contract Main0021_changeAllowedDifferenceAmount {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);

    function execute(Main0021_changeAllowedDifferenceAmount /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        // LOCK_DIFF_LIMIT and LOAN_DIFF_LIMIT stays the same
        // ALLOWED_DIFF_AMOUNT: change from 1000000 to 5000000 (10 000.00 -> 50 000.00)

        // LOCK_DIFF_LIMIT, LOAN_DIFF_LIMIT, ALLOWED_DIFF_AMOUNT
        MONETARY_SUPERVISOR.setLtdParams(200000, 200000, 5000000);
    }
}