/* adjust interest rates
*/

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";


contract Rink0004_adjustInterest {

    LoanManager constant loanManager = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);
    Locker constant locker = Locker(0x5B94AaF241E8039ed6d3608760AE9fA7186767d7);

    function execute(Rink0004_adjustInterest /* self (not used)*/ ) external {
        /******************************************************************************
         * Disable old and add new LOAN products
         ******************************************************************************/
        loanManager.setLoanProductActiveState(0, false);
        loanManager.setLoanProductActiveState(1, false);
        loanManager.setLoanProductActiveState(2, false);
        loanManager.setLoanProductActiveState(3, false);
        loanManager.setLoanProductActiveState(4, false);

        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(30 days, 986219, 600000, 1000, 50000, true); //  17% p.a.
        loanManager.addLoanProduct(14 days, 993900, 600000, 1000, 50000, true); // 16% p.a.
        loanManager.addLoanProduct(7 days, 997132, 600000, 1000, 50000, true); // 15% p.a.

        loanManager.addLoanProduct(1 hours, 999998, 980000, 2000, 50000, true); // due in 1hr for testing repayments ? p.a.
        loanManager.addLoanProduct(1 seconds, 999999, 990000, 3000, 50000, true); // defaults in 1 secs for testing ? p.a.

        /******************************************************************************
         * Disable old and add new LOCK products
         ******************************************************************************/
        locker.setLockProductActiveState(0, false);
        locker.setLockProductActiveState(1, false);
        locker.setLockProductActiveState(2, false);
        locker.setLockProductActiveState(3, false);
        locker.setLockProductActiveState(4, false);

        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        locker.addLockProduct(9864, 30 days, 1000, true);  // 12% p.a.
        locker.addLockProduct(4220, 14 days, 1000, true);  // 11% p.a.
        locker.addLockProduct(1918, 7 days, 1000, true);    // 10% p.a.

        locker.addLockProduct(100, 1 hours, 2000, true); // for testing, ~87.60% p.a.
        locker.addLockProduct(2 , 1 minutes, 3000, true); // for testing, ~105.12% p.a.
    }

}
