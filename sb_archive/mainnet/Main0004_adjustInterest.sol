/* adjust interest lock & loan interest rates and min loan amounts */

pragma solidity 0.4.24;

import "../../generic/MultiSig.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";


contract Main0004_adjustInterest {

    LoanManager constant loanManager = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);
    Locker constant locker = Locker(0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c);

    function execute(Main0004_adjustInterest /* self (not used)*/ ) external {
        /******************************************************************************
         * Disable old and add new LOAN products
         ******************************************************************************/
        loanManager.setLoanProductActiveState(0, false);
        loanManager.setLoanProductActiveState(1, false);
        loanManager.setLoanProductActiveState(2, false);

        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(30 days, 987821, 600000, 800, 50000, true); //  15% p.a.
        loanManager.addLoanProduct(14 days, 994279, 600000, 800, 50000, true); // 15% p.a.
        loanManager.addLoanProduct(7 days, 997132, 600000, 800, 50000, true); // 15% p.a.

        /******************************************************************************
         * Disable old and add new LOCK products
         ******************************************************************************/
        locker.setLockProductActiveState(0, false);
        locker.setLockProductActiveState(1, false);
        locker.setLockProductActiveState(2, false);

        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        locker.addLockProduct(8220, 30 days, 1000, true);  // 10% p.a.
        locker.addLockProduct(3836, 14 days, 1000, true);  // 10% p.a.
        locker.addLockProduct(1918, 7 days, 1000, true);    // 10% p.a.

    }

}
