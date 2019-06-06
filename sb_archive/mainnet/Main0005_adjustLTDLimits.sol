/* increase allowedDifferenceAmount to 2,000 A-EUR
    (ltdLock and loan diff limit stays the same, 20%)
*/

pragma solidity 0.4.24;
import "../../MonetarySupervisor.sol";

contract Main0005_adjustLTDLimits {

    MonetarySupervisor constant monetarySupervisor = MonetarySupervisor(0x1Ca4F9d261707aF8A856020a4909B777da218868);

    function execute(Main0005_adjustLTDLimits /* self (not used)*/ ) external {
        monetarySupervisor.setLtdParams(
            200000 /* ltdLockDifferenceLimit = 20%  allow lock if Loan To Deposit ratio stays within 1 - this param
                        stored as parts per million */,
            200000 /* ltdLoanDifferenceLimit = 20%  allow loan if Loan To Deposit ratio stays within 1 + this param
                                                                                                stored as parts per million */,
            200000 /* allowedLtdDifferenceAmount = 2,000 A-EUR  if totalLoan and totalLock difference is less than that
                            then allow loan or lock even if ltdDifference limit would go off with it */
        );
    }
}
