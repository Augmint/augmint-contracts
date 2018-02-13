/* MonetarySupervisor
    - maintains system wide KPIs (eg totalLockAmount, totalLoanAmount)
    - holds system wide parameters/limits
    - enforces system wide limits
    - Send funds from reserve to exchange when intervening (not implemented yet)

    TODO:
        - MonetarySupervisorInterface (and use it everywhere)
        - interestEarnedAccount setter?
        - create and use InterestEarnedAccount interface instead?

*/

pragma solidity 0.4.19;
import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./InterestEarnedAccount.sol";
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

    // Locker requesting interest when locking funds
    function requestInterest(uint amountToLock, uint interestAmount) external {
        require(permissions[msg.sender]["LockerContracts"]); // only whitelisted LockerContracts
        /* TODO: enforce LTD limits (ltdDifferenceLimit & allowedLtdDifferenceAmount) */

        totalLockedAmount = totalLockedAmount.add(amountToLock);
        interestEarnedAccount.transferInterest(augmintToken, msg.sender, interestAmount); // transfer interest to Locker
    }

    // Locker notifying when releasing funds to update KPIs
    function releaseFundsNotification(uint lockedAmount) external {
        require(permissions[msg.sender]["LockerContracts"]); // only whitelisted LockerContracts
        totalLockedAmount = totalLockedAmount.sub(lockedAmount);
    }

    function issueLoan(address borrower, uint loanAmount) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted LoanManager contracts
        totalLoanAmount = totalLoanAmount.add(loanAmount);
        augmintToken.issueTo(borrower, loanAmount);
    }

    function burnLoan(uint loanAmount) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted Lender contracts
        totalLoanAmount = totalLoanAmount.sub(loanAmount);
        augmintToken.burnFrom(msg.sender, loanAmount);
    }

    // NB: this is called by Lender contract with the sum of all loans collected in batch
    function loanCollectionNotification(uint totalLoanAmountCollected) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted Lender contracts
        totalLoanAmount = totalLoanAmount.sub(totalLoanAmountCollected);
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

    // convenience function - alternative to Exchange.placeSellTokenOrder without approval required
    function placeSellTokenOrderOnExchange(address _exchange, uint price, uint tokenAmount)
    external returns (uint sellTokenOrderId) {
        require(permissions[_exchange]["ExchangeContracts"]); // only whitelisted exchanges
        ExchangeInterface exchange = ExchangeInterface(_exchange);
        _transfer(msg.sender, _exchange, tokenAmount, "Sell token order placed");
        return exchange.placeSellTokenOrderTrusted(msg.sender, price, tokenAmount);
    } */


}
