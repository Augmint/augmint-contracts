/* set defaulting fee from 5% to 10% */

pragma solidity 0.4.24;

import "../../LoanManager.sol";


contract Rink0010_changeDefaultingFee {
    address constant stabilityBoardProxyAddress = 0x44022C28766652EC5901790E53CEd7A79a19c10A;

    LoanManager constant loanManager = LoanManager(0x3b5DD323534659655EEccc642c3e338AAbD0B219);

    function execute(Rink0010_changeDefaultingFee /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == stabilityBoardProxyAddress, "execute only via StabilityBoardProxy");

        /******************************************************************************
         * Add new loan products with 10% defaulting fee
         ******************************************************************************/
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        loanManager.addLoanProduct(30 days, 990641, 600000, 1000, 100000, true); //  12% p.a.
        loanManager.addLoanProduct(14 days, 996337, 600000, 1000, 100000, true); // 10% p.a.
        loanManager.addLoanProduct(7 days, 998170, 600000, 1000, 100000, true); // 10% p.a.

        loanManager.addLoanProduct(1 hours, 999989, 980000, 2000, 100000, true); // due in 1hr for testing repayments ? p.a.
        loanManager.addLoanProduct(1 seconds, 999999, 990000, 3000, 100000, true); // defaults in 1 secs for testing ? p.a.

        /******************************************************************************
         * Disable old  loan products
         ******************************************************************************/
        loanManager.setLoanProductActiveState(5, false);
        loanManager.setLoanProductActiveState(6, false);
        loanManager.setLoanProductActiveState(7, false);
        loanManager.setLoanProductActiveState(8, false);
        loanManager.setLoanProductActiveState(9, false);

    }

}
