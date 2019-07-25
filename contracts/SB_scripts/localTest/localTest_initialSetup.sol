/* script to setup contracts deployed on local test ganache instance
        - one instance can be executed by StabilityBoardProxy only once
    NB: live scripts (rinkeby & mainnet etc.) will have contracts setup from constant addresses
*/

pragma solidity 0.4.24;

import "../../generic/AugmintToken.sol";
import "../../generic/MultiSig.sol";
import  "../../Rates.sol";
import "../../FeeAccount.sol";
import "../../AugmintReserves.sol";
import "../../InterestEarnedAccount.sol";
import "../../TokenAEur.sol";
import "../../MonetarySupervisor.sol";
import "../../LoanManager.sol";
import "../../Locker.sol";
import "../../Exchange.sol";
import "../../test/SafeMathTester.sol";


contract localTest_initialSetup {
    /* struct SystemContracts  */
    Rates public rates;
    FeeAccount public feeAccount;
    AugmintReserves public augmintReserves;
    InterestEarnedAccount public interestEarnedAccount;
    TokenAEur public tokenAEur;
    MonetarySupervisor public monetarySupervisor;
    LoanManager public loanManager;
    Locker public locker;
    Exchange public exchange;
    SafeMathTester public safeMathTester;

    constructor(Rates _rates,
                FeeAccount _feeAccount,
                AugmintReserves _augmintReserves,
                InterestEarnedAccount _interestEarnedAccount,
                TokenAEur _tokenAEur,
                MonetarySupervisor _monetarySupervisor,
                LoanManager _loanManager,
                Locker _locker,
                Exchange _exchange,
                SafeMathTester _safeMathTester) public {
        rates = _rates;
        feeAccount = _feeAccount;
        augmintReserves = _augmintReserves;
        interestEarnedAccount = _interestEarnedAccount;
        tokenAEur = _tokenAEur;
        monetarySupervisor = _monetarySupervisor;
        loanManager = _loanManager;
        locker = _locker;
        exchange = _exchange;
        safeMathTester = _safeMathTester;
    }

    function execute(localTest_initialSetup self) external {
        //MultiSig multiSig = MultiSig(address(this));
        Rates _rates = self.rates();
        FeeAccount _feeAccount = self.feeAccount();
        AugmintReserves _augmintReserves = self.augmintReserves();
        InterestEarnedAccount _interestEarnedAccount = self.interestEarnedAccount();
        TokenAEur _tokenAEur = self.tokenAEur();
        MonetarySupervisor _monetarySupervisor = self.monetarySupervisor();
        LoanManager _loanManager = self.loanManager();
        Locker _locker = self.locker();
        Exchange _exchange = self.exchange();

        // StabilityBoard
        _rates.grantPermission(address(this), "StabilityBoard");
        _feeAccount.grantPermission(address(this), "StabilityBoard");
        _interestEarnedAccount.grantPermission(address(this), "StabilityBoard");
        _tokenAEur.grantPermission(address(this), "StabilityBoard");
        _augmintReserves.grantPermission(address(this), "StabilityBoard");
        _monetarySupervisor.grantPermission(address(this), "StabilityBoard");
        _loanManager.grantPermission(address(this), "StabilityBoard");
        _locker.grantPermission(address(this), "StabilityBoard");
        _exchange.grantPermission(address(this), "StabilityBoard");


        // RatesFeeder permissions to allow calling setRate() and initial EUR/ETH rates
        _rates.grantPermission(msg.sender, "RatesFeeder");
        _rates.grantPermission(address(this), "RatesFeeder");
        _rates.setRate("EUR", 99800);

        // set NoTransferFee permissions
        _feeAccount.grantPermission(_feeAccount, "NoTransferFee");
        _feeAccount.grantPermission(_augmintReserves, "NoTransferFee");
        _feeAccount.grantPermission(_interestEarnedAccount, "NoTransferFee");
        _feeAccount.grantPermission(_monetarySupervisor, "NoTransferFee");
        _feeAccount.grantPermission(_loanManager, "NoTransferFee");
        _feeAccount.grantPermission(_locker, "NoTransferFee");
        _feeAccount.grantPermission(_exchange, "NoTransferFee");

        // set MonetarySupervisor permissions
        _interestEarnedAccount.grantPermission(_monetarySupervisor, "MonetarySupervisor");
        _tokenAEur.grantPermission(_monetarySupervisor, "MonetarySupervisor");
        _augmintReserves.grantPermission(_monetarySupervisor, "MonetarySupervisor");

        // set LoanManager permissions
        _monetarySupervisor.grantPermission(_loanManager, "LoanManager");

        // set Locker permissions
        _monetarySupervisor.grantPermission(_locker, "Locker");

        // add test loan Products
        // term (in sec), discountRate, initialCollateralRatio (ppm), minDisbursedAmount (token), defaultingFeePt (ppm), isActive, minCollateralRatio (ppm)
        _loanManager.addLoanProduct(365 days, 854701, 1850000, 1000, 50000, true, 1500000); //  17% p.a., (collateral ratio: initial = 185%, minimum = 150%)
        _loanManager.addLoanProduct(180 days, 924753, 1850000, 1000, 50000, true, 1500000); // 16.5% p.a., (collateral ratio: initial = 185%, minimum = 150%)

        _loanManager.addLoanProduct(90 days, 962046, 1600000, 1000, 50000, true, 1200000); // 16%. p.a., (collateral ratio: initial = 160%, minimum = 120%)
        _loanManager.addLoanProduct(60 days, 975154, 1600000, 1000, 50000, true, 1200000); //  15.5% p.a., (collateral ratio: initial = 160%, minimum = 120%)
        _loanManager.addLoanProduct(30 days, 987822, 1600000, 1000, 50000, true, 1200000); //  15% p.a., (collateral ratio: initial = 160%, minimum = 120%)
        _loanManager.addLoanProduct(14 days, 994280, 1600000, 1000, 50000, true, 1200000); // 15% p.a., (collateral ratio: initial = 160%, minimum = 120%)
        _loanManager.addLoanProduct(7 days, 997132, 1600000, 1000, 50000, true, 1200000); // 15% p.a., (collateral ratio: initial = 160%, minimum = 120%)

        _loanManager.addLoanProduct(1 hours, 999000, 1230000, 2000, 50000, true, 1050000); // due in 1hr for testing repayments ~877% p.a., (collateral ratio: initial = 123%, minimum = 105%)
        _loanManager.addLoanProduct(1 seconds, 999000, 1110000, 3000, 50000, true, 1020000); // defaults in 1 secs for testing ~3156757% p.a., (collateral ratio: initial = 111%, minimum = 102%)

        // add test lock products
        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        _locker.addLockProduct(120000, 365 days, 1000, true); // 12% p.a.
        _locker.addLockProduct(56713, 180 days, 1000, true);  // 11.5% p.a.

        _locker.addLockProduct(27124, 90 days, 1000, true);   // 11% p.a.
        _locker.addLockProduct(17261, 60 days, 1000, true);   // 10.5% p.a.
        _locker.addLockProduct(8220, 30 days, 1000, true);    // 10% p.a.
        _locker.addLockProduct(3836, 14 days, 1000, true);    // 10% p.a.
        _locker.addLockProduct(1918, 7 days, 1000, true);     //  10% p.a.

        _locker.addLockProduct(3, 1 hours, 2000, true); // for testing, ~2.66% p.a.
        _locker.addLockProduct(1 , 1 minutes, 3000, true); // for testing, ~69.15% p.a.
        _locker.addLockProduct(1 , 1 seconds, 1000, true); // for testing, ~3153.6% p.a.

    }

}
