/* script to setup  contracts  deplyomed on local test ganache instance
        - one instance can be executed by StabilityBoardSigner only once
    NB: live scripts (rinkeby & mainnet etc.) will have contracts setup from constant addresses
*/

pragma solidity 0.4.24;

import "../../generic/AugmintToken.sol";
import "../../generic/MultiSig.sol";
import  "../../Rates.sol";
import "../..//FeeAccount.sol";
import "../..//AugmintReserves.sol";
import "../..//InterestEarnedAccount.sol";
import "../..//TokenAEur.sol";
import "../..//MonetarySupervisor.sol";
import "../..//LoanManager.sol";
import "../..//Locker.sol";
import "../..//Exchange.sol";


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

    constructor(Rates _rates,
                FeeAccount _feeAccount,
                AugmintReserves _augmintReserves,
                InterestEarnedAccount _interestEarnedAccount,
                TokenAEur _tokenAEur,
                MonetarySupervisor _monetarySupervisor,
                LoanManager _loanManager,
                Locker _locker,
                Exchange _exchange ) public {
        rates = _rates;
        feeAccount = _feeAccount;
        augmintReserves = _augmintReserves;
        interestEarnedAccount = _interestEarnedAccount;
        tokenAEur = _tokenAEur;
        monetarySupervisor = _monetarySupervisor;
        loanManager = _loanManager;
        locker = _locker;
        exchange = _exchange;
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

        // setRate permissions and initial ETH/EUR rates
        _rates.grantPermission(msg.sender, "setRate");
        _rates.grantPermission(address(this), "setRate");
        _rates.setRate("EUR", 99800);

        // set NoFeeTransferContracts permissions
        _feeAccount.grantPermission(_feeAccount, "NoFeeTransferContracts");
        _feeAccount.grantPermission(_augmintReserves, "NoFeeTransferContracts");
        _feeAccount.grantPermission(_interestEarnedAccount, "NoFeeTransferContracts");
        _feeAccount.grantPermission(_monetarySupervisor, "NoFeeTransferContracts");
        _feeAccount.grantPermission(_loanManager, "NoFeeTransferContracts");
        _feeAccount.grantPermission(_locker, "NoFeeTransferContracts");
        _feeAccount.grantPermission(_exchange, "NoFeeTransferContracts");

        // set MonetarySupervisorContract permissions
        _interestEarnedAccount.grantPermission(_monetarySupervisor, "MonetarySupervisorContract");
        _tokenAEur.grantPermission(_monetarySupervisor, "MonetarySupervisorContract");
        _augmintReserves.grantPermission(_monetarySupervisor, "MonetarySupervisorContract");

        // set LoanManagerContracts permissions
        _monetarySupervisor.grantPermission(_loanManager, "LoanManagerContracts");

        // set LockerContracts permissions
        _monetarySupervisor.grantPermission(_locker, "LockerContracts");

        // add test loan Products
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        _loanManager.addLoanProduct(365 days, 860000, 550000, 1000, 50000, true); //  14% p.a.
        _loanManager.addLoanProduct(180 days, 937874, 550000, 1000, 50000, true); // 13% p.a.

        _loanManager.addLoanProduct(90 days, 971661, 600000, 1000, 50000, true); // 12%. p.a.
        _loanManager.addLoanProduct(30 days, 990641, 600000, 1000, 50000, true); //  12% p.a.
        _loanManager.addLoanProduct(14 days, 996337, 600000, 1000, 50000, true); // 10% p.a.
        _loanManager.addLoanProduct(7 days, 998170, 600000, 1000, 50000, true); // 10% p.a.

        _loanManager.addLoanProduct(1 hours, 999989, 980000, 2000, 50000, true); // due in 1hr for testing repayments ? p.a.
        _loanManager.addLoanProduct(1 seconds, 999999, 990000, 3000, 50000, true); // defaults in 1 secs for testing ? p.a.

        // add test lock products
        // (perTermInterest, durationInSecs, minimumLockAmount, isActive)
        _locker.addLockProduct(80001, 365 days, 1000, true); // 8% p.a.
        _locker.addLockProduct(33929, 180 days, 1000, true); // 7% p.a.

        _locker.addLockProduct(14472, 90 days, 1000, true); // 6% p.a.
        _locker.addLockProduct(4019, 30 days, 1000, true);  // 5% p.a.
        _locker.addLockProduct(1506, 14 days, 1000, true);  // 4% p.a.
        _locker.addLockProduct(568, 7 days, 1000, true);    //  3% p.a.

        _locker.addLockProduct(3, 1 hours, 2000, true); // for testing, ~2.66% p.a.
        _locker.addLockProduct(1 , 1 minutes, 3000, true); // for testing, ~69.15% p.a.

    }

}
