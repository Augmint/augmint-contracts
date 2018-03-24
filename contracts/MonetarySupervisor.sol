/* MonetarySupervisor
    - maintains system wide KPIs (eg totalLockAmount, totalLoanAmount)
    - holds system wide parameters/limits
    - enforces system wide limits
    - burns and issues to AugmintReserves
    - Send funds from reserve to exchange when intervening (not implemented yet)
    - Converts older versions of AugmintTokens in 1:1 to new

    TODO:
        - enforce LTD limits
        - MonetarySupervisorInterface (and use it everywhere)
        - interestEarnedAccount setter?
        - create and use InterestEarnedAccount interface instead?

*/

pragma solidity 0.4.19;
import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./interfaces/TokenReceiver.sol";
import "./InterestEarnedAccount.sol";
import "./AugmintReserves.sol";


contract MonetarySupervisor is Restricted, TokenReceiver { // solhint-disable-line no-empty-blocks
    using SafeMath for uint256;

    AugmintTokenInterface public augmintToken;
    InterestEarnedAccount public interestEarnedAccount;
    AugmintReserves public augmintReserves;

    uint public issuedByMonetaryBoard; // supply issued manually by monetary board

    uint public totalLoanAmount; // total amount of all loans without interest, in token
    uint public totalLockedAmount; // total amount of all locks without premium, in token

    /* Parameters Used to ensure totalLoanAmount or totalLockedAmount difference is withing limit and system also works
        when any of those 0 or low. */
    uint public ltdDifferenceLimit;     /* allow lock or loan if Loan To Deposut ratio stay within 1 +- this param
                                            stored as parts per million */
    uint public allowedLtdDifferenceAmount; /* in token - if totalLoan and totalLock difference is less than that
                                             then allow loan or lock even if ltdDifference limit would go off with it */

    /* Previously deployed AugmintTokens which are accepted for conversion (see transferNotification() )
        NB: it's not iterable so old version addresses needs to be added for UI manually after each deploy */
    mapping(address => bool) public acceptedLegacyAugmintTokens;

    event ParamsChanged(uint ltdDifferenceLimit, uint allowedLtdDifferenceAmount);

    event AcceptedLegacyAugmintTokenChanged(address augmintTokenAddress, bool newAcceptedState);

    function MonetarySupervisor(AugmintTokenInterface _augmintToken, AugmintReserves _augmintReserves,
        InterestEarnedAccount _interestEarnedAccount,
        uint _ltdDifferenceLimit, uint _allowedLtdDifferenceAmount) public {
        augmintToken = _augmintToken;
        augmintReserves = _augmintReserves;
        interestEarnedAccount = _interestEarnedAccount;

        ltdDifferenceLimit = _ltdDifferenceLimit;
        allowedLtdDifferenceAmount = _allowedLtdDifferenceAmount;
    }

    function issueToReserve(uint amount) external restrict("MonetaryBoard") {
        issuedByMonetaryBoard = issuedByMonetaryBoard.add(amount);
        augmintToken.issueTo(augmintReserves, amount);
    }

    function burnFromReserve(uint amount) external restrict("MonetaryBoard") {
        issuedByMonetaryBoard = issuedByMonetaryBoard.sub(amount);
        augmintReserves.burn(augmintToken, amount);
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

    function loanRepaymentNotification(uint loanAmount) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted Lender contracts
        totalLoanAmount = totalLoanAmount.sub(loanAmount);
    }

    // NB: this is called by Lender contract with the sum of all loans collected in batch
    function loanCollectionNotification(uint totalLoanAmountCollected) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted Lender contracts
        totalLoanAmount = totalLoanAmount.sub(totalLoanAmountCollected);
    }

    function setAcceptedLegacyAugmintToken(address legacyAugmintTokenAddress, bool newAcceptedState)
    external restrict("MonetaryBoard") {
        acceptedLegacyAugmintTokens[legacyAugmintTokenAddress] = newAcceptedState;
        AcceptedLegacyAugmintTokenChanged(legacyAugmintTokenAddress, newAcceptedState);
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

    /* User can request to convert their tokens from older AugmintToken versions in 1:1
      transferNotification is called from AugmintToken's transferAndNotify
     Flow for converting old tokens:
        1) user calls old token contract's transferAndNotify with the amount to convert,
                addressing the new MonetarySupervisor Contract
        2) transferAndNotify transfers user's old tokens to the current MonetarySupervisor contract's address
        3) transferAndNotify calls MonetarySupervisor.transferNotification
        4) MonetarySupervisor checks if old AugmintToken is permitted
        5) MonetarySupervisor issues new tokens to user's account in current AugmintToken
        6) MonetarySupervisor burns old tokens from own balance
    */
    function transferNotification(address from, uint amounToConvert, uint) public {
        AugmintTokenInterface legacyToken = AugmintTokenInterface(msg.sender);
        require(acceptedLegacyAugmintTokens[legacyToken]);

        legacyToken.burn(amounToConvert);
        augmintToken.issueTo(from, amounToConvert);
    }

}
