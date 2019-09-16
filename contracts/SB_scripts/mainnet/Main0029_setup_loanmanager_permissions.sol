/* Setup new margin loan manager permissions */

pragma solidity 0.4.24;

import "../../LoanManager.sol";
import "../../StabilityBoardProxy.sol";
import "../../FeeAccount.sol";
import "../../MonetarySupervisor.sol";

contract Main0029_setup_loanmanager_permissions {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    LoanManager public constant LOAN_MANAGER = LoanManager(0xEb57c12b1E69b4d10b1eD7a33231d31b811464b7);

    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xE3ED84A163b9EeaF4f69B4890ae45cC52171Aa7E);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);

    function execute(Main0029_setup_loanmanager_permissions /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        // StabilityBoard permission
        LOAN_MANAGER.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");

        // NoTransferFee permission
        FEE_ACCOUNT.grantPermission(address(LOAN_MANAGER), "NoTransferFee");

        // LoanManager permission
        MONETARY_SUPERVISOR.grantPermission(address(LOAN_MANAGER), "LoanManager");
    }
}