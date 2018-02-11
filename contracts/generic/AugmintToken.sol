/* Generic Augmint Token implementation (ERC20 token)
    This contract manages:
        * Balances of Augmint holders and transactions between them
        * Issues and burns tokens when loan issued or repaid
        * Holds reserves:
            - ETH as regular ETH balance of the contract
            - ERC20 token reserve (stored as regular Token balance under the contract address)

        Note that all reserves are held under the contract address,
          therefore any transaction on the reserve is limited to the tx-s defined here
          (ie. transfer of reserve is not possible by the contract owner)
    TODO: ERC20 short address attack protection? https://github.com/DecentLabs/dcm-poc/issues/62
    TODO: create a LockerInterface and use that instead of Locker.sol ?
*/
pragma solidity 0.4.19;
import "../interfaces/AugmintTokenInterface.sol";
import "../interfaces/LoanManagerInterface.sol";
import "../interfaces/ExchangeInterface.sol";
import "../Locker.sol";


contract AugmintToken is AugmintTokenInterface {

    address public feeAccount;
    address public interestEarnedAccount;
    uint public transferFeePt; // in parts per million (ppm) , ie. 2,000 = 0.2%
    uint public transferFeeMin; // with base unit of augmint token, eg. 4 decimals for token, eg. 31000 = 3.1 ACE
    uint public transferFeeMax; // with base unit of augmint token, eg. 4 decimals for token, eg. 31000 = 3.1 ACE

    uint public issuedByMonetaryBoard; // supply issued manually by monetary board

    uint public totalLoanAmount; // total amount of all loans without interest, in token
    uint public totalLockedAmount; // total amount of all locks without premium, in token
    uint public loanToDepositLockLimit; // in ppm - don't allow new lock if ratio would go BELOW with new lock
    uint public loanToDepositLoanLimit; // in ppm - don't allow new loan if ratio would go ABOVE with new loan

    // Parameters Used to avoid system halt when there totalLoanAmount or totalLockedAmount is 0 or very low.
    uint public lockNoLimitAllowance;   // in token - if totalLockAmount is below this then a new lock is allowed
                                        // up to this amount even if it will bring the loanToDepositRatio BELOW
                                        // loanToDepositLoanLimit
                                        // (interest earned account balance still applies a limit on top of it)
    uint public loanNoLimitAllowance;   // in token - if totalLoanAmount is below this then a new loan is allowed
                                        // up this amount even if it will bring the loanToDepositRatio
                                        // ABOVE loanToDepositLoanLimit


    event TransferFeesChanged(uint transferFeePt, uint transferFeeMin, uint transferFeeMax);

    event LoanToDepositLimitsChanged(uint loanToDepositLockLimit, uint loanToDepositLoanLimit);

    event LoanAndLockParamsChanged(uint loanToDepositLockLimit, uint loanToDepositLoanLimit,
                                    uint lockNoLimitAllowance, uint loanNoLimitAllowance);

    function AugmintToken(string _name, string _symbol, bytes32 _peggedSymbol, uint8 _decimals, address _feeAccount,
        address _interestEarnedAccount, uint _transferFeePt, uint _transferFeeMin, uint _transferFeeMax,
        uint _loanToDepositLockLimit, uint _loanToDepositLoanLimit,
        uint _lockNoLimitAllowance, uint _loanNoLimitAllowance) public {

        require(_feeAccount != address(0));
        require(_interestEarnedAccount != address(0));
        require(bytes(_name).length > 0);
        name = _name;
        symbol = _symbol;
        peggedSymbol = _peggedSymbol;
        decimals = _decimals;
        feeAccount = _feeAccount;
        interestEarnedAccount = _interestEarnedAccount;
        transferFeePt = _transferFeePt;
        transferFeeMin = _transferFeeMin;
        transferFeeMax = _transferFeeMax;
        loanToDepositLockLimit = _loanToDepositLockLimit;
        loanToDepositLoanLimit = _loanToDepositLoanLimit;
        lockNoLimitAllowance = _lockNoLimitAllowance;
        loanNoLimitAllowance = _loanNoLimitAllowance;
    }

    function () public payable { // solhint-disable-line no-empty-blocks
        // to accept ETH sent into reserve (from defaulted loan's collateral )
    }

    // Issue tokens to Reserve
    function issue(uint amount) external restrict("MonetaryBoard") {
        issuedByMonetaryBoard = issuedByMonetaryBoard.add(amount);
        _issue(this, amount);
    }

    // Burn tokens from Reserve
    function burn(uint amount) external restrict("MonetaryBoard") {
        issuedByMonetaryBoard = issuedByMonetaryBoard.sub(amount);
        _burn(this, amount);
    }

    function lockFunds(address lockerAddress, uint lockProductId, uint amountToLock) external {
        require(permissions[lockerAddress]["LockerContracts"]); // only whitelisted LockerContracts

        // NB: locker.createLock will validate lockProductId and amountToLock:
        Locker locker = Locker(lockerAddress);
        uint interestEarnedAmount = locker.createLock(lockProductId, msg.sender, amountToLock);
        totalLockedAmount = totalLockedAmount.add(amountToLock);

        _transfer(msg.sender, address(locker), amountToLock, "Funds locked");
        _transfer(interestEarnedAccount, address(locker), interestEarnedAmount, "Accrue lock interest");

    }

    /* called by Locker.releaseFunds to maintain totalLockAmount */
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

    /* Users must repay through AugmintToken.repayLoan()*/
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

    /* called by LoanManager.collect to maintain totalLoanAmount */
    function loanCollected(uint loanAmount) external {
        require(permissions[msg.sender]["LoanManagerContracts"]); // only whitelisted loanManagers
        totalLoanAmount = totalLoanAmount.sub(loanAmount);
    }

    /* convenience function - alternative to Exchange.placeSellTokenOrder without approval required */
    function placeSellTokenOrderOnExchange(address _exchange, uint price, uint tokenAmount)
    external returns (uint sellTokenOrderId) {
        require(permissions[_exchange]["ExchangeContracts"]); // only whitelisted exchanges
        ExchangeInterface exchange = ExchangeInterface(_exchange);
        _transfer(msg.sender, _exchange, tokenAmount, "Sell token order placed");
        return exchange.placeSellTokenOrderTrusted(msg.sender, price, tokenAmount);
    }

    function transferWithNarrative(address to, uint256 amount, string narrative) external {
        _transfer(msg.sender, to, amount, narrative);
    }

    function setTransferFees(uint _transferFeePt, uint _transferFeeMin, uint _transferFeeMax)
    external restrict("MonetaryBoard") {
        transferFeePt = _transferFeePt;
        transferFeeMin = _transferFeeMin;
        transferFeeMax = _transferFeeMax;
        TransferFeesChanged(transferFeePt, transferFeeMin, transferFeeMax);
    }

    function setLoanAndLockParams(uint _loanToDepositLockLimit, uint _loanToDepositLoanLimit,
                                    uint _lockNoLimitAllowance, uint _loanNoLimitAllowance)
    external restrict("MonetaryBoard") {
        loanToDepositLockLimit = _loanToDepositLockLimit;
        loanToDepositLoanLimit = _loanToDepositLoanLimit;
        lockNoLimitAllowance = _lockNoLimitAllowance;
        loanNoLimitAllowance = _loanNoLimitAllowance;
        LoanAndLockParamsChanged(loanToDepositLockLimit, loanToDepositLoanLimit,
                                    lockNoLimitAllowance, loanNoLimitAllowance);
    }

    /* helper function for FrontEnd to reduce calls */
    function getParams() external view returns(uint[7]) {
        return [transferFeePt, transferFeeMin, transferFeeMax,
                loanToDepositLockLimit, loanToDepositLoanLimit, lockNoLimitAllowance, loanNoLimitAllowance];
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount, "");
        return true;
    }

    function approve(address _spender, uint256 amount) public returns (bool) {
        require(_spender != 0x0);
        require(msg.sender != _spender); // no need to approve for myself. Makes client code simpler if we don't allow
        allowed[msg.sender][_spender] = amount;
        Approval(msg.sender, _spender, amount);
        return true;
    }

    /**
     ERC20 transferFrom attack protection: https://github.com/DecentLabs/dcm-poc/issues/57
     approve should be called when allowed[_spender] == 0. To increment allowed value is better
     to use this function to avoid 2 calls (and wait until the first transaction is mined)
     Based on MonolithDAO Token.sol */
    function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
        return _increaseApproval(msg.sender, _spender, _addedValue);
    }

    function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
        require(msg.sender != _spender); // no need to approve for myself. Makes client code simpler if we don't allow
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        _transferFrom(from, to, amount, "");
        return true;
    }

    function transferFromWithNarrative(
        address from,
        address to,
        uint256 amount,
        string narrative
    ) public {
        _transferFrom(from, to, amount, narrative);
    }

    function _increaseApproval(address _approver, address _spender, uint _addedValue) internal returns (bool) {
        require(_approver != _spender); // no need to approve for myself. Makes client code simpler if we don't allow
        allowed[_approver][_spender] = allowed[_approver][_spender].add(_addedValue);
        Approval(_approver, _spender, allowed[_approver][_spender]);
    }

    function calculateFee(address from, address to, uint amount) internal view returns (uint256 fee) {
        if (!permissions[from]["NoFeeTransferContracts"] && !permissions[to]["NoFeeTransferContracts"]) {
            if (amount > 0) {
                fee = amount.mul(transferFeePt).div(1000000);
            } else {
                fee = 0;
            }
            if (fee > transferFeeMax) {
                fee = transferFeeMax;
            } else if (fee < transferFeeMin) {
                fee = transferFeeMin;
            }
        }
        return fee;
    }

    function _transferFrom(address from, address to, uint256 amount, string narrative) private {
        require(balances[from] >= amount);
        require(allowed[from][msg.sender] >= amount);
        require(allowed[from][msg.sender] > 0); // don't allow 0 transferFrom if no approval

        /* NB: fee is deducted from owner. It can result that transferFrom of amount x to fail
                when x + fee is not availale on owner balance */
        _transfer(from, to, amount, narrative);

        allowed[from][msg.sender] = allowed[from][msg.sender].sub(amount);
    }

    function _transfer(address from, address to, uint256 amount, string narrative) private {
        require(to != 0x0);
        require(from != to); // no need to send to myself. Makes client code simpler if we don't allow
        uint fee = calculateFee(from, to, amount);
        if (fee > 0) {
            balances[feeAccount] = balances[feeAccount].add(fee);
            balances[from] = balances[from].sub(amount).sub(fee);
        } else {
            balances[from] = balances[from].sub(amount);
        }
        balances[to] = balances[to].add(amount);
        Transfer(from, to, amount);
        AugmintTransfer(from, to, amount, narrative, fee);
    }

    function _burn(address from, uint amount) private {
        balances[from] = balances[from].sub(amount);
        totalSupply = totalSupply.sub(amount);
        Transfer(from, 0x0, amount);
    }

    function _issue(address to, uint amount) private {
        balances[to] = balances[to].add(amount);
        totalSupply = totalSupply.add(amount);
        Transfer(0x0, to, amount);
    }
}
