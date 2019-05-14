/* Recreate loan products on mainnet (fix for discountRate rounding error) */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../LoanManager.sol";

contract Main0025_recreateLoanProducts {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x1cABc34618ecf2949F0405A86353e7705E01C38b);

    function execute(Main0025_recreateLoanProducts /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");


        /******************************************************************************
         * Disable current loan products
         ******************************************************************************/

        LOAN_MANAGER.setLoanProductActiveState(1, false);
        LOAN_MANAGER.setLoanProductActiveState(2, false);
        LOAN_MANAGER.setLoanProductActiveState(3, false);
        LOAN_MANAGER.setLoanProductActiveState(4, false);
        LOAN_MANAGER.setLoanProductActiveState(5, false);


        /******************************************************************************
         * Add new loan products
         ******************************************************************************/

        // Formulas used for conversion:

        // IRPA: Interest Rate Per Annum : the percentage value on the UI
        // LPDR: Loan Product Discount Rate : uint32 discountRate constructor parameter

        // IRPA = (1_000_000 / LPDR - 1) * (365 / termInDays)
        // LPDR = 1_000_000 / (IRPA * termInDays / 365 + 1)

        // discountRates:
        // [180, 90, 30, 14, 7].map(termInDays => Math.ceil(1000000 / (0.049 * termInDays / 365 + 1)))
        // [976406, 988063, 995989, 998125, 999062]

        // addLoanProduct:
        // term, discountRate, collateralRatio, minDisbursedAmount, defaultingFeePt, isActive

        LOAN_MANAGER.addLoanProduct(180 days, 976406, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(90 days, 988063, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(30 days, 995989, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(14 days, 998125, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(7 days, 999062, 600000, 800, 100000, true); // 4.9% p.a.

    }
}