/* This script has ran but transfered 0 AEUR because mistakenly transfered from FEE_ACCOUNT instead of reserve */
pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../FeeAccount.sol";
import "../../TokenAEur.sol";

contract Main0035_aeur_reserve_transfer {
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(
        0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84
    );
    TokenAEur public constant AUGMINT_TOKEN = TokenAEur(0xc994a2dEb02543Db1f48688438b9903c4b305ce3);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xE3ED84A163b9EeaF4f69B4890ae45cC52171Aa7E);
    address public constant TARGET_ADDRESS = 0x53DBF6E8fe46307C7536eAbb0D90CADA3e732716;

    function execute(
        Main0035_aeur_reserve_transfer /* self, not used */
    ) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        FEE_ACCOUNT.withdraw(AUGMINT_TOKEN, TARGET_ADDRESS, 0, address(FEE_ACCOUNT).balance, "");
    }
}
