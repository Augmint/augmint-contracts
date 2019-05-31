/* adjust lock & loan interest rates, increase allowedLtdDifferenceAmount and
    disable lock products in legacy locker (correctly run Main0007_stopOldLocker) */

pragma solidity 0.4.24;

import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../MonetarySupervisor.sol";


contract Main0011_adjustInterest {

    LoanManager constant loanManager = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);
    Locker constant locker = Locker(0x26438D7c52cE617dFc75A2F02eE816557f01e5Bb);
    Locker constant oldLocker = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);

    function execute(Main0011_adjustInterest /* self (not used)*/ ) external {
        /******************************************************************************
         * Disable old and add new LOAN products
         ******************************************************************************/
        loanManager.setLoanProductActiveState(6, false);
        loanManager.setLoanProductActiveState(7, false);
        loanManager.setLoanProductActiveState(8, false);

        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(365 days, 953288, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(180 days, 976405, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(90 days, 988062, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(30 days, 995988, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(14 days, 998124, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(7 days, 999062, 600000, 800, 100000, true); // 4.9% p.a.

        /******************************************************************************
         * Disable all products in legacy locker (wrongly ran at Main0007Main0007_stopOldLocker)
         ******************************************************************************/
        oldLocker.setLockProductActiveState(3, false);
        oldLocker.setLockProductActiveState(4, false);
        oldLocker.setLockProductActiveState(5, false);

        /******************************************************************************
         * Disable old and add new LOCK products
         ******************************************************************************/
        locker.setLockProductActiveState(0, false);
        locker.setLockProductActiveState(1, false);
        locker.setLockProductActiveState(2, false);
        locker.setLockProductActiveState(3, false);
        locker.setLockProductActiveState(4, false);

        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        locker.addLockProduct(45000, 365 days, 1000, true);  // 4.5% p.a.
        locker.addLockProduct(22192, 180 days, 1000, true);  // 4.5% p.a.
        locker.addLockProduct(11096, 90 days, 1000, true);  // 4.5% p.a.
        locker.addLockProduct(3699, 30 days, 1000, true);  // 4.5% p.a.
        locker.addLockProduct(1727, 14 days, 1000, true);  // 4.5% p.a.
        locker.addLockProduct(864, 7 days, 1000, true);    // 4.5% p.a.

        monetarySupervisor.setLtdParams(
            200000 /* ltdLockDifferenceLimit = 20%  allow lock if Loan To Deposit ratio stays within 1 - this param
                        stored as parts per million */,
            200000 /* ltdLoanDifferenceLimit = 20%  allow loan if Loan To Deposit ratio stays within 1 + this param
                                                                                                stored as parts per million */,
            1000000 /* allowedLtdDifferenceAmount = 10,000 A-EUR  if totalLoan and totalLock difference is less than that
                            then allow loan or lock even if ltdDifference limit would go off with it */
        );
    }

}
