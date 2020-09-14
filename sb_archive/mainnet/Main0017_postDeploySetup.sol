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

contract Main0017_postDeploySetup {

    /******************************************************************************
     * StabilityBoardProxy
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    MonetarySupervisor public constant NEW_MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);
    Rates public constant NEW_RATES = Rates(0x4272dB2EB82068E898588C3D6e4B5D55c3848793);

    /******************************************************************************
     * Legacy contracts
     ******************************************************************************/
    Exchange public constant OLD_EXCHANGE_1 = Exchange(0x8b52b019d237d0bbe8Baedf219132D5254e0690b);
    Exchange public constant OLD_EXCHANGE_2 = Exchange(0xEAe7D30bCD44F27d58985b56ADD007FceE254AbD);
    Exchange public constant OLD_EXCHANGE_3 = Exchange(0xaFEA54baDf7A68F93C2235B5F4cC8F02a2b55Edd);
    LoanManager public constant OLD_LOAN_MANAGER = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);
    Locker public constant OLD_LOCKER_1 = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);
    Locker public constant OLD_LOCKER_2 = Locker(0x26438D7c52cE617dFc75A2F02eE816557f01e5Bb);
    MonetarySupervisor public constant OLD_MONETARY_SUPERVISOR = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);

    function execute(Main0017_postDeploySetup /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");


        /******************************************************************************
         * Migrate KPIs from old MonetarySupervisor
         ******************************************************************************/
        uint oldTotalLoan = OLD_MONETARY_SUPERVISOR.totalLoanAmount();
        uint oldTotalLock = OLD_MONETARY_SUPERVISOR.totalLockedAmount();
        NEW_MONETARY_SUPERVISOR.adjustKPIs(oldTotalLoan, oldTotalLock);


        /******************************************************************************
         * Set new MonetarySupervisor in old Locker
         ******************************************************************************/
        OLD_LOCKER_1.setMonetarySupervisor(NEW_MONETARY_SUPERVISOR);
        OLD_LOCKER_2.setMonetarySupervisor(NEW_MONETARY_SUPERVISOR);

        /******************************************************************************
         * Set new Rates and MonetarySupervisor in old LoanManager
         ******************************************************************************/
        OLD_LOAN_MANAGER.setSystemContracts(NEW_RATES, NEW_MONETARY_SUPERVISOR);

        /******************************************************************************
         * Set new Rates in old Exchange
         ******************************************************************************/
        OLD_EXCHANGE_1.setRatesContract(NEW_RATES);
        OLD_EXCHANGE_2.setRatesContract(NEW_RATES);
        OLD_EXCHANGE_3.setRatesContract(NEW_RATES);


        /******************************************************************************
         * Disable old loan products
         ******************************************************************************/
        OLD_LOAN_MANAGER.setLoanProductActiveState(9, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(10, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(11, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(12, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(13, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(14, false);

        /******************************************************************************
         * Disable old lock products
         ******************************************************************************/
        OLD_LOCKER_2.setLockProductActiveState(5, false);
        OLD_LOCKER_2.setLockProductActiveState(6, false);
        OLD_LOCKER_2.setLockProductActiveState(7, false);
        OLD_LOCKER_2.setLockProductActiveState(8, false);
        OLD_LOCKER_2.setLockProductActiveState(9, false);
        OLD_LOCKER_2.setLockProductActiveState(10, false);
    }
}