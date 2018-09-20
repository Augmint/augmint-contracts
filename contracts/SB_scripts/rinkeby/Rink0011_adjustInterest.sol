/* adjust lock & loan interest rates, increase allowedLtdDifferenceAmount  */

pragma solidity 0.4.24;

import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../MonetarySupervisor.sol";


contract Rink0011_adjustInterest {

    LoanManager constant loanManager = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);
    Locker constant locker = Locker(0xF74c0CB2713214808553CDA5C78f92219478863d);
    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8);

    function execute(Rink0011_adjustInterest /* self (not used)*/ ) external {
        /******************************************************************************
         * Disable old and add new LOAN products
         ******************************************************************************/
        loanManager.setLoanProductActiveState(10, false);
        loanManager.setLoanProductActiveState(11, false);
        loanManager.setLoanProductActiveState(12, false);
        loanManager.setLoanProductActiveState(13, false);
        loanManager.setLoanProductActiveState(14, false);

        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(365 days, 953288, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(180 days, 976405, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(90 days, 988062, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(30 days, 995988, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(14 days, 998124, 600000, 800, 100000, true); // 4.9% p.a.
        loanManager.addLoanProduct(7 days, 999062, 600000, 800, 100000, true); // 4.9% p.a.

        loanManager.addLoanProduct(1 hours, 999989, 980000, 2000, 50000, true); // due in 1hr for testing repayments ? p.a.
        loanManager.addLoanProduct(1 minutes, 999999, 990000, 3000, 50000, true); // defaults in 1 secs for testing ? p.a.

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

        locker.addLockProduct(100, 1 hours, 2000, true); // for testing, ~87.60% p.a.
        locker.addLockProduct(2 , 1 minutes, 3000, true); // for testing, ~105.12% p.a.


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
