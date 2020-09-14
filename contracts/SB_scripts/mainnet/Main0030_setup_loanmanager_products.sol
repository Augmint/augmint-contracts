/* Setup new margin loan manager products, disable old loanamnager products */

pragma solidity 0.4.24;

import "../../LoanManager.sol";
import "../../StabilityBoardProxy.sol";

contract Main0030_setup_loanmanager_products {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    LoanManager public constant LOAN_MANAGER = LoanManager(0xEb57c12b1E69b4d10b1eD7a33231d31b811464b7);
    LoanManager public constant OLD_LOAN_MANAGER = LoanManager(0x1cABc34618ecf2949F0405A86353e7705E01C38b);

    function execute(Main0030_setup_loanmanager_products /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Add loan products
         ******************************************************************************/
        // term (in sec), discountRate, initialCollateralRatio (ppm), minDisbursedAmount (token),
        // defaultingFeePt (ppm), isActive, minCollateralRatio (ppm)
        // 4.9% => [976406, 988063, 995989, 998125, 999062]

        LOAN_MANAGER.addLoanProduct(180 days, 976406, 1600000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(90 days, 988063, 1600000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(30 days, 995989, 1600000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(14 days, 998125, 1600000, 800, 100000, true, 1200000);
        LOAN_MANAGER.addLoanProduct(7 days, 999062, 1600000, 800, 100000, true, 1200000);


        /******************************************************************************
         * Disable previous loan products
         ******************************************************************************/

        OLD_LOAN_MANAGER.setLoanProductActiveState(6, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(7, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(8, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(9, false);
        OLD_LOAN_MANAGER.setLoanProductActiveState(10, false);
    }
}