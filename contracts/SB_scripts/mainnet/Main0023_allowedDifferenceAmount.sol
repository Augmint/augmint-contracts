/* Change allowedDifferenceAmount in LtdParams */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../MonetarySupervisor.sol";

contract Main0023_allowedDifferenceAmount {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);

    function execute(Main0023_allowedDifferenceAmount /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");


        // =======================================================
        //  Change LtdParams.allowedDifferenceAmount to 200,000A€
        // =======================================================

        // LOCK_DIFF_LIMIT and LOAN_DIFF_LIMIT stays the same
        // ALLOWED_DIFF_AMOUNT: change from 5000000 to 20000000 (50 000.00 -> 200 000.00)

        // LOCK_DIFF_LIMIT, LOAN_DIFF_LIMIT, ALLOWED_DIFF_AMOUNT
        MONETARY_SUPERVISOR.setLtdParams(200000, 200000, 20000000);
    }
}