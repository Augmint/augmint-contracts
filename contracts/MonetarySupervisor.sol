/* MonetarySupervisor
    - maintains system wide KPIs (eg totalLockAmount, totalLoanAmount)
    - holds system wide parameters/limits
    - enforces system wide limits
    - Send funds from reserve to exchange when intervening (not implemented yet)

    TODO:
     - MonetarySupervisorInterface (and use it everywhere)
    - interestEarnedAccount setter?

*/

pragma solidity 0.4.19;
import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./InterestEarnedAccount.sol";
import "./interfaces/LoanManagerInterface.sol";
import "./interfaces/ExchangeInterface.sol";
import "./Locker.sol";


contract MonetarySupervisor is Restricted { // solhint-disable-line no-empty-blocks
    using SafeMath for uint256;

    AugmintTokenInterface public augmintToken;
    InterestEarnedAccount public interestEarnedAccount;

    uint public issuedByMonetaryBoard; // supply issued manually by monetary board

    uint public totalLoanAmount; // total amount of all loans without interest, in token
    uint public totalLockedAmount; // total amount of all locks without premium, in token

    /* Parameters Used to ensure totalLoanAmount or totalLockedAmount difference is withing limit and system also works
        when any of those 0 or low. */
    uint public ltdDifferenceLimit;     /* allow lock or loan if Loan To Deposut ratio stay within 1 +- this param
                                            stored as parts per million */
    uint public allowedLtdDifferenceAmount; /* in token - if totalLoan and totalLock difference is less than that
                                             then allow loan or lock even if ltdDifference limit would go off with it */

    event ParamsChanged(uint ltdDifferenceLimit, uint allowedLtdDifferenceAmount);

    function MonetarySupervisor(AugmintTokenInterface _augmintToken, InterestEarnedAccount _interestEarnedAccount,
        uint _ltdDifferenceLimit, uint _allowedLtdDifferenceAmount) public {
        augmintToken = _augmintToken;
        interestEarnedAccount = _interestEarnedAccount;

        ltdDifferenceLimit = _ltdDifferenceLimit;
        allowedLtdDifferenceAmount = _allowedLtdDifferenceAmount;
    }

    // Issue tokens to Reserve
    function issue(uint amount) external restrict("MonetaryBoard") {
        issuedByMonetaryBoard = issuedByMonetaryBoard.add(amount);
        augmintToken.issueTo(augmintToken, amount);
    }

    // Burn tokens from Reserve
    function burn(uint amount) external restrict("MonetaryBoard") {
        issuedByMonetaryBoard = issuedByMonetaryBoard.sub(amount);
        augmintToken.burnFrom(augmintToken, amount);
    }

    function setParams(uint _ltdDifferenceLimit, uint _allowedLtdDifferenceAmount)
    external restrict("MonetaryBoard") {
        ltdDifferenceLimit = _ltdDifferenceLimit;
        allowedLtdDifferenceAmount = _allowedLtdDifferenceAmount;

        ParamsChanged(ltdDifferenceLimit, allowedLtdDifferenceAmount);
    }

    // helper function for FrontEnd to reduce calls
    function getParams() external view returns(uint[2]) {
        return [ltdDifferenceLimit, allowedLtdDifferenceAmount];
    }

    /*
    function lockFunds(address lockerAddress, uint lockProductId, uint amountToLock) external {
        require(permissions[lockerAddress]["LockerContracts"]); // only whitelisted LockerContracts

        // NB: locker.createLock will validate lockProductId and amountToLock:
        Locker locker = Locker(lockerAddress);
        uint interestEarnedAmount = locker.createLock(lockProductId, msg.sender, amountToLock);
        totalLockedAmount = totalLockedAmount.add(amountToLock);

        _transfer(msg.sender, address(locker), amountToLock, "Funds locked");
        _transfer(interestEarnedAccount, address(locker), interestEarnedAmount, "Accrue lock interest");

    }

    // called by Locker.releaseFunds to maintain totalLockAmount
    function fundsReleased(uint amountLocked) external {
        require(permissions[msg.sender]["LockerContracts"]); // only whitelisted LockerContracts
        totalLockedAmount = totalLockedAmount.sub(amountLocked);
    }

    function issueAndDisburse(address borrower, uint loanAmount, uint repaymentAmount, string narrative)
    external restrict("LoanManagerContracts") {
        require(loanAmount > 0);
        require(repaymentAmount > 0);
        totalLoanAmount = totalLoanAmount.add(loanAmount);
        _issue(msg.sender, loanAmount);
        _transfer(msg.sender, borrower, loanAmount, narrative);
    }

    // Users must repay through AugmintToken.repayLoan()
    function repayLoan(address _loanManager, uint loanId) external {
        require(permissions[_loanManager]["LoanManagerContracts"]); // only whitelisted loanManagers
        LoanManagerInterface loanManager = LoanManagerInterface(_loanManager);
        // solhint-disable-next-line space-after-comma
        var (borrower, , , repaymentAmount , loanAmount, interestAmount, ) = loanManager.loans(loanId);
        require(borrower == msg.sender);

        totalLoanAmount = totalLoanAmount.sub(loanAmount);
        _transfer(msg.sender, _loanManager, repaymentAmount, "Loan repayment");
        _burn(_loanManager, loanAmount);
        if (interestAmount > 0) {
            // transfer interestAmount to InterestEarnedAccount (internal transfer, no need for Transfer events)
            balances[_loanManager] = balances[_loanManager].sub(interestAmount);
            balances[interestEarnedAccount] = balances[interestEarnedAccount].add(interestAmount);
        }
        loanManager.releaseCollateral(loanId);
    }

    // called by LoanManager.collect to maintain totalLoanAmount
    function loanCollected(uint loanAmount) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted loanManagers
        totalLoanAmount = totalLoanAmount.sub(loanAmount);
    }

    // convenience function - alternative to Exchange.placeSellTokenOrder without approval required
    function placeSellTokenOrderOnExchange(address _exchange, uint price, uint tokenAmount)
    external returns (uint sellTokenOrderId) {
        require(permissions[_exchange]["ExchangeContracts"]); // only whitelisted exchanges
        ExchangeInterface exchange = ExchangeInterface(_exchange);
        _transfer(msg.sender, _exchange, tokenAmount, "Sell token order placed");
        return exchange.placeSellTokenOrderTrusted(msg.sender, price, tokenAmount);
    } */


}
