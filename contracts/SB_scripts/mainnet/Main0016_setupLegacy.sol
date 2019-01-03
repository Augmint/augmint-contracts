/* Setup new and legacy contract dependencies */

pragma solidity 0.4.24;

import "../../AugmintReserves.sol";
import "../../Exchange.sol";
import "../../FeeAccount.sol";
import "../../InterestEarnedAccount.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../MonetarySupervisor.sol";
import "../../Rates.sol";
import "../../TokenAEur.sol";
import "../../StabilityBoardProxy.sol";

contract Main0016_setupLegacy {

    /******************************************************************************
     * StabilityBoardProxy
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    MonetarySupervisor public constant NEW_MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    FeeAccount public constant OLD_FEE_ACCOUNT = FeeAccount(0xF6B541E1B5e001DCc11827C1A16232759aeA730a);
    LoanManager public constant OLD_LOAN_MANAGER = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);
    Locker public constant OLD_LOCKER_1 = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);
    Locker public constant OLD_LOCKER_2 = Locker(0x26438D7c52cE617dFc75A2F02eE816557f01e5Bb);
    TokenAEur public constant OLD_TOKEN_AEUR = TokenAEur(0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0);

    function execute(Main0016_setupLegacy /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");


        /******************************************************************************
         * Setup permissions in new contracts for legacy contracts
         ******************************************************************************/
        NEW_MONETARY_SUPERVISOR.grantPermission(address(OLD_LOAN_MANAGER), "LoanManager");
        NEW_MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_1), "Locker");
        NEW_MONETARY_SUPERVISOR.grantPermission(address(OLD_LOCKER_2), "Locker");

        /******************************************************************************
         * Accept legacy tokens
         ******************************************************************************/
        NEW_MONETARY_SUPERVISOR.setAcceptedLegacyAugmintToken(OLD_TOKEN_AEUR, true);


        /******************************************************************************
         * Setup permissions in legacy contracts for new contracts
         ******************************************************************************/
        OLD_FEE_ACCOUNT.grantPermission(address(NEW_MONETARY_SUPERVISOR), "NoTransferFee");

    }
}