/* Disable the one year lock and loan products */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";

contract Main0024_disableOneYearProducts {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x1cABc34618ecf2949F0405A86353e7705E01C38b);
    Locker public constant LOCKER = Locker(0x5Cc161482E82f20840A4AAEB582beCBCC4b539D7);

    function execute(Main0024_disableOneYearProducts /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        LOAN_MANAGER.setLoanProductActiveState(0, false);
        LOCKER.setLockProductActiveState(0, false);
    }
}