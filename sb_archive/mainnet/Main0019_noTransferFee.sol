/* Eliminate transfer fee */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../FeeAccount.sol";

contract Main0019_noTransferFee {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xE3ED84A163b9EeaF4f69B4890ae45cC52171Aa7E);

    function execute(Main0019_noTransferFee /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        FEE_ACCOUNT.setTransferFees(0, 0, 0);
    }
}