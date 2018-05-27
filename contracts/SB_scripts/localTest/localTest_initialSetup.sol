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


    }

}
