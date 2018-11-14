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
    address public constant RATES_FEEDER_ACCOUNT = 0x8C58187a978979947b88824DCdA5Cb5fD4410387;

    /******************************************************************************
     * New contracts
     ******************************************************************************/
    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    AugmintReserves public constant AUGMINT_RESERVES = AugmintReserves(0x65F30f8DD20c707C1938CcAd7416c7381E6eB9C8);
    Exchange public constant EXCHANGE = Exchange(0xc670FFBfa21c37481FB4EF2eA2249B9B78D2B073);
    FeeAccount public constant FEE_ACCOUNT = FeeAccount(0xE3ED84A163b9EeaF4f69B4890ae45cC52171Aa7E);
    InterestEarnedAccount public constant INTEREST_EARNED_ACCOUNT = InterestEarnedAccount(0xf23e0AF0e41341127Bb4e7b203aebCA0185f9EbD);
    LoanManager public constant LOAN_MANAGER = LoanManager(0x1cABc34618ecf2949F0405A86353e7705E01C38b);
    Locker public constant LOCKER = Locker(0x5Cc161482E82f20840A4AAEB582beCBCC4b539D7);
    MonetarySupervisor public constant MONETARY_SUPERVISOR = MonetarySupervisor(0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3);
    Rates public constant RATES = Rates(0x4272dB2EB82068E898588C3D6e4B5D55c3848793);
    TokenAEur public constant TOKEN_AEUR = TokenAEur(0xc994a2dEb02543Db1f48688438b9903c4b305ce3);
    PreToken public constant PRE_TOKEN = PreToken(0x97ea02179801FA94227DB5fC1d13Ac4277d40920);
    PreTokenProxy public constant PRE_TOKEN_PROXY = PreTokenProxy(0x8a69cf9d1D85bC150F69FeB80cC34c552F5fbea9);

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


        //  PreToken signers and permissions

        address[] memory preTokenSigners = new address[](3);
        preTokenSigners[0] = 0xd8203A652452906586F2E6cB6e31f6f7fed094D4;  // Sz.K.
        preTokenSigners[1] = 0xf9ea0E2857405C859bb8647ECB11f931D1259753;  // P.P.
        PRE_TOKEN_PROXY.addSigners(preTokenSigners);

        PRE_TOKEN.grantPermission(address(PRE_TOKEN_PROXY), "PreTokenSigner");
        PRE_TOKEN.grantPermission(address(PRE_TOKEN_PROXY), "PermissionGranter");
        PRE_TOKEN.revokePermission(address(STABILITY_BOARD_PROXY), "PermissionGranter");


        // StabilityBoard signers in new StabilityBoardProxy on Mainnet

        address[] memory stabilityProxySigners = new address[](2);
        stabilityProxySigners[0] = 0x53DBF6E8fe46307C7536eAbb0D90CADA3e732716;    // Sz.V.
        stabilityProxySigners[1] = 0xAE162e28575Ba898dc08D283f2Be10AE8b4114A2;    // Sz.K.
        stabilityProxySigners[2] = 0x9de3F6E7caCbb7e1c2489dFCe21abbB0ecEE6213;    // P.P.
        STABILITY_BOARD_PROXY.addSigners(stabilityProxySigners);


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