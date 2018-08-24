/* set defaulting fee from 5% to 10% */


pragma solidity 0.4.24;

import "../../LoanManager.sol";


contract Main0009_changeDefaultingFee {
    address constant stabilityBoardProxyAddress = 0x4686f017D456331ed2C1de66e134D8d05B24413D;

    LoanManager constant loanManager = LoanManager(0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070);

    function execute(Main0009_changeDefaultingFee /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == stabilityBoardProxyAddress, "only deploy via stabilityboardsigner");

        /******************************************************************************
         * Add new loan products with 10% defaulting fee
         ******************************************************************************/
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(30 days, 987821, 600000, 800, 100000, true); //  15% p.a.
        loanManager.addLoanProduct(14 days, 994279, 600000, 800, 100000, true); // 15% p.a.
        loanManager.addLoanProduct(7 days, 997132, 600000, 800, 100000, true); // 15% p.a.

        /******************************************************************************
         * Disable old LOAN products
         ******************************************************************************/
        loanManager.setLoanProductActiveState(3, false);
        loanManager.setLoanProductActiveState(4, false);
        loanManager.setLoanProductActiveState(5, false);

    }

}
