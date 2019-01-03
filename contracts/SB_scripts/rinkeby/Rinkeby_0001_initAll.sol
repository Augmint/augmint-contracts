/* Set up new contracts */

pragma solidity 0.4.24;

import "../../AugmintReserves.sol";
import "../../Exchange.sol";
import "../../FeeAccount.sol";
import "../../InterestEarnedAccount.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../MonetarySupervisor.sol";
import "../../Rates.sol";
import "../../TokenAEur.sol";
import "../../StabilityBoardProxy.sol";
import "../../PreToken.sol";
import "../../PreTokenProxy.sol";

contract Rinkeby_0001_initAll {

    /******************************************************************************
     * External dependencies
     ******************************************************************************/
    address public constant RATES_FEEDER_ACCOUNT = 0x8C58187a978979947b88824DCdA5Cb5fD4410387;

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0x50d281C28846576EAaf679Ab6F3BaaC52b776e72);
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0xC036a1DD59Ac55e2fB6b3D7416cb4ECC44605834);
    Exchange public constant EXCHANGE = Exchange(0xDF47D51028DafF13424F42523FdAc73079ab901b);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xB77F9cDdA72eEC47a57793Be088C7b523f6b5014);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0x489cbf1674b575e6dFcFF0A4F2BBc74f7e9DDe28);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x6CB7731c78E677f85942B5f1D646b3485E5820c1);
    Locker public constant LOCKER = Locker(0x6d84aB6c385B827E58c358D078AC7b1C61b68821);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0xCeC3574ECa89409b15a8A72A6E737C4171457871);
    Rates public constant RATES = Rates(0xDfA3a0aEb9645a55b684CB3aCE8C42D018405bDa);
    TokenAEur public constant TOKEN_AEUR = TokenAEur(0x0557183334Edc23a666201EDC6b0AA2787e2ad3F);
    PreToken public constant PRE_TOKEN = PreToken(0xA7B67E7E3E7f1e76E8d799A690F675abeB85c788);
    PreTokenProxy public constant PRE_TOKEN_PROXY = PreTokenProxy(0xB7CAe2C48F3F34b9696FD290001deA16B299498A);

    function execute(Rinkeby_0001_initAll /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        /******************************************************************************
         * Set up permissions
         ******************************************************************************/

        // StabilityBoard permission
        AUGMINT_RESERVES.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        EXCHANGE.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        FEE_ACCOUNT.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        INTEREST_EARNED_ACCOUNT.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        LOAN_MANAGER.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        LOCKER.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        MONETARY_SUPERVISOR.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        RATES.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");
        TOKEN_AEUR.grantPermission(address(STABILITY_BOARD_PROXY), "StabilityBoard");

        // RatesFeeder permission (allows calling setRate)
        RATES.grantPermission(address(RATES_FEEDER_ACCOUNT), "RatesFeeder");

        // NoTransferFee permission
        FEE_ACCOUNT.grantPermission(address(AUGMINT_RESERVES), "NoTransferFee");
        FEE_ACCOUNT.grantPermission(address(EXCHANGE), "NoTransferFee");
        FEE_ACCOUNT.grantPermission(address(FEE_ACCOUNT), "NoTransferFee");
        FEE_ACCOUNT.grantPermission(address(INTEREST_EARNED_ACCOUNT), "NoTransferFee");
        FEE_ACCOUNT.grantPermission(address(LOAN_MANAGER), "NoTransferFee");
        FEE_ACCOUNT.grantPermission(address(LOCKER), "NoTransferFee");
        FEE_ACCOUNT.grantPermission(address(MONETARY_SUPERVISOR), "NoTransferFee");

        // MonetarySupervisor permission
        AUGMINT_RESERVES.grantPermission(address(MONETARY_SUPERVISOR), "MonetarySupervisor");
        INTEREST_EARNED_ACCOUNT.grantPermission(address(MONETARY_SUPERVISOR), "MonetarySupervisor");
        TOKEN_AEUR.grantPermission(address(MONETARY_SUPERVISOR), "MonetarySupervisor");

        // LoanManager permission
        MONETARY_SUPERVISOR.grantPermission(address(LOAN_MANAGER), "LoanManager");

        // Locker permission
        MONETARY_SUPERVISOR.grantPermission(address(LOCKER), "Locker");


        //  PreToken permissions
        PRE_TOKEN.grantPermission(address(PRE_TOKEN_PROXY), "PreTokenSigner");
        PRE_TOKEN.grantPermission(address(PRE_TOKEN_PROXY), "PermissionGranter");
        PRE_TOKEN.revokePermission(address(STABILITY_BOARD_PROXY), "PermissionGranter");


        /******************************************************************************
         * Add loan products
         ******************************************************************************/
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        LOAN_MANAGER.addLoanProduct(365 days, 953288, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(180 days, 976405, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(90 days, 988062, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(30 days, 995988, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(14 days, 998124, 600000, 800, 100000, true); // 4.9% p.a.
        LOAN_MANAGER.addLoanProduct(7 days, 999062, 600000, 800, 100000, true); // 4.9% p.a.

        LOAN_MANAGER.addLoanProduct(1 hours, 999989, 980000, 2000, 50000, true); // due in 1hr for testing repayments ? p.a.
        LOAN_MANAGER.addLoanProduct(1 minutes, 999999, 990000, 3000, 50000, true); // defaults in 1 secs for testing ? p.a.

        /******************************************************************************
         * Add lock products
         ******************************************************************************/
        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        LOCKER.addLockProduct(45000, 365 days, 1000, true);  // 4.5% p.a.
        LOCKER.addLockProduct(22192, 180 days, 1000, true);  // 4.5% p.a.
        LOCKER.addLockProduct(11096, 90 days, 1000, true);  // 4.5% p.a.
        LOCKER.addLockProduct(3699, 30 days, 1000, true);  // 4.5% p.a.
        LOCKER.addLockProduct(1727, 14 days, 1000, true);  // 4.5% p.a.
        LOCKER.addLockProduct(864, 7 days, 1000, true);    // 4.5% p.a.

        LOCKER.addLockProduct(100, 1 hours, 2000, true); // for testing, ~87.60% p.a.
        LOCKER.addLockProduct(2, 1 minutes, 3000, true); // for testing, ~105.12% p.a.
    }
}