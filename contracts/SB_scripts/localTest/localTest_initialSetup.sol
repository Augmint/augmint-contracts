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

        // Set ETH/EUR rates
        Rates _rates = self.rates();
        _rates.grantPermission(msg.sender, "setRate");
        _rates.grantPermission(address(this), "setRate");
        _rates.setRate("EUR", 99800);
    }

}
