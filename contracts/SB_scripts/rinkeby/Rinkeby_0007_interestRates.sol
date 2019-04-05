/* New lock and loan products with different interest rates, change allowedDifferenceAmount */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../MonetarySupervisor.sol";

contract Rinkeby_0007_interestRates {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xa612de13B629a1FF790c1f4E41d0422d2bB50a30);

    LoanManager public constant LOAN_MANAGER = LoanManager(0x3792c5a5077DacfE331B81837ef73bC0Ea721d90);
    Locker public constant LOCKER = Locker(0xc0B97fE5CAD0d43D0c974C4E9A00312dc661f8Ab);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x4A7F6EcbE8B324A55b85adcc45313A412957B8ea);


    function execute(Rinkeby_0007_interestRates /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");



        // ======================================================
        //  Replace loan products (change interest rate to 1.5%)
        // ======================================================

        // Formulas used for conversion:

        // IRPA: Interest Rate Per Annum : the percentage value on the UI
        // LPDR: Loan Product Discount Rate : uint32 discountRate constructor parameter

        // IRPA = (1_000_000 / LPDR - 1) * (365 / termInDays)
        // LPDR = 1_000_000 / (IRPA * termInDays / 365 + 1)

        // actual js code:
        // [365, 180, 90, 30, 14, 7].map(termInDays => Math.ceil(1000000 / (0.015 * termInDays / 365 + 1)))
        // [985222, 992658, 996315, 998769, 999425, 999713]


        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        disableAllLoanProducts(LOAN_MANAGER);
        LOAN_MANAGER.addLoanProduct(365 days, 985222, 600000, 800, 100000, true); // 1.5% p.a.
        LOAN_MANAGER.addLoanProduct(180 days, 992658, 600000, 800, 100000, true); // 1.5% p.a.
        LOAN_MANAGER.addLoanProduct(90 days, 996315, 600000, 800, 100000, true); // 1.5% p.a.
        LOAN_MANAGER.addLoanProduct(30 days, 998769, 600000, 800, 100000, true); // 1.5% p.a.
        LOAN_MANAGER.addLoanProduct(14 days, 999425, 600000, 800, 100000, true); // 1.5% p.a.
        LOAN_MANAGER.addLoanProduct(7 days, 999713, 600000, 800, 100000, true); // 1.5% p.a.



        // ======================================================
        //  Replace lock products (change interest rate to 1.4%)
        // ======================================================

        // Formulas used for conversion:

        // IRPA: Interest Rate Per Annum : the percentage value on the UI
        // PTI: Per Term Interest : uint32 perTermInterest constructor parameter

        // IRPA = (PTI / 1_000_000) * (365 / termInDays)
        // PTI = (IRPA * 1_000_000) * (termInDays / 365)

        // actual js code:
        // [365, 180, 90, 30, 14, 7].map(termInDays => Math.ceil((0.014 * 1000000) * (termInDays / 365)))
        // [14000, 6905, 3453, 1151, 537, 269]


        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        disableAllLockProducts(LOCKER);
        LOCKER.addLockProduct(14000, 365 days, 1000, true); // 1.4% p.a.
        LOCKER.addLockProduct(6905, 180 days, 1000, true); // 1.4% p.a.
        LOCKER.addLockProduct(3453, 90 days, 1000, true); // 1.4% p.a.
        LOCKER.addLockProduct(1151, 30 days, 1000, true); // 1.4% p.a.
        LOCKER.addLockProduct(537, 14 days, 1000, true); // 1.4% p.a.
        LOCKER.addLockProduct(269, 7 days, 1000, true); // 1.4% p.a.



        // =======================================================
        //  Change LtdParams.allowedDifferenceAmount to 200,000A€
        // =======================================================

        // LOCK_DIFF_LIMIT and LOAN_DIFF_LIMIT stays the same
        // ALLOWED_DIFF_AMOUNT: change from 5000000 to 20000000 (50 000.00 -> 200 000.00)

        // LOCK_DIFF_LIMIT, LOAN_DIFF_LIMIT, ALLOWED_DIFF_AMOUNT
        MONETARY_SUPERVISOR.setLtdParams(200000, 200000, 20000000);

    }

    function disableAllLockProducts(Locker target) internal {
        uint32 productCount = uint32(target.getLockProductCount());
        for (uint32 i = 0; i < productCount; i++) {
            uint32 perTermInterest;
            uint32 durationInSecs;
            uint32 minimumLockAmount;
            bool isActive;
            (perTermInterest, durationInSecs, minimumLockAmount, isActive) = target.lockProducts(i);
            if (isActive) {
                target.setLockProductActiveState(i, false);
            }
        }
    }

    function disableAllLoanProducts(LoanManager target) internal {
        uint32 productCount = uint32(target.getProductCount());
        for (uint32 i = 0; i < productCount; i++) {
            uint minDisbursedAmount;
            uint32 term;
            uint32 discountRate;
            uint32 collateralRatio;
            uint32 defaultingFeePt;
            bool isActive;
            (minDisbursedAmount, term, discountRate, collateralRatio, defaultingFeePt, isActive) = target.products(i);
            if (isActive) {
                target.setLoanProductActiveState(i, false);
            }
        }
    }

}