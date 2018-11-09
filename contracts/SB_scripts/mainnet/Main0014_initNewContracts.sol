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

contract Main0014_initNewContracts {

    /******************************************************************************
     * External dependencies
     ******************************************************************************/
    address public constant RATES_FEEDER_ACCOUNT = ;

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy();
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves();
    Exchange public constant EXCHANGE = Exchange();
    FeeAccount public constant FEE_ACCOUNT = FeeAccount();
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount();
    LoanManager public constant LOAN_MANAGER = LoanManager();
    Locker public constant LOCKER = Locker();
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor();
    Rates public constant RATES = Rates();
    TokenAEur public constant TOKEN_AEUR = TokenAEur();
    PreToken public constant PRE_TOKEN = PreToken();
    PreTokenProxy public constant PRE_TOKEN_PROXY = PreTokenProxy();

    function execute(Main0014_initNewContracts /* self, not used */) external {
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

    }
}