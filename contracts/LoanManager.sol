/*
    Contract to manage Augmint token loan contracts backed by ETH
    For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/loanFlow.png

    TODO:
        - interestEarnedAccount setter?
        - create MonetarySupervisor interface and use it instead?
        - make data arg generic bytes?
        - create and use InterestEarnedAccount interface instead?
        - make collect() run as long as gas provided allows
*/
pragma solidity 0.4.19;

import "./Rates.sol";
import "./generic/Restricted.sol";
import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./InterestEarnedAccount.sol";
import "./MonetarySupervisor.sol";


contract LoanManager is Restricted {
    using SafeMath for uint256;

    enum LoanState { Open, Repaid, Defaulted }

    struct LoanProduct {
        uint term; // 0
        uint discountRate; // 1: discountRate in parts per million , ie. 10,000 = 1%
        uint collateralRatio;   // 2: loan token amount / colleteral pegged ccy value
                                // in parts per million , ie. 10,000 = 1%
        uint minDisbursedAmount; // 3: with 4 decimals, e.g. 31000 = 3.1ACE
        uint defaultingFeePt; // 4: % of collateral in parts per million , ie. 50,000 = 5%
        bool isActive; // 5
    }

    struct LoanData {
        address borrower; // 0
        LoanState state; // 1
        uint collateralAmount; // 2
        uint repaymentAmount; // 3
        uint loanAmount; // 4
        uint interestAmount; // 5
        uint term; // 6
        uint disbursementDate; // 7
        uint maturity; // 8
        uint defaultingFeePt; // 9
    }

    LoanProduct[] public products;

    LoanData[] public loans;
    mapping(address => uint[]) public mLoans;  // owner account address =>  array of loan Ids

    Rates public rates; // instance of ETH/pegged currency rate provider contract
    AugmintTokenInterface public augmintToken; // instance of token contract
    MonetarySupervisor public monetarySupervisor;
    InterestEarnedAccount public interestEarnedAccount;

    event NewLoan(uint productId, uint loanId, address borrower, uint collateralAmount, uint loanAmount,
        uint repaymentAmount);

    event LoanProductActiveStateChanged(uint productId, bool newState);

    event LoanProductAdded(uint productId);

    event LoanRepayed(uint loanId, address borrower);

    event LoanCollected(uint indexed loanId, address indexed borrower, uint collectedCollateral,
        uint releasedCollateral, uint defaultingFee);

    function LoanManager(AugmintTokenInterface _augmintToken, MonetarySupervisor _monetarySupervisor, Rates _rates,
                            InterestEarnedAccount _interestEarnedAccount)
    public {
        augmintToken = _augmintToken;
        monetarySupervisor = _monetarySupervisor;
        rates = _rates;
        interestEarnedAccount = _interestEarnedAccount;
    }

    function addLoanProduct(uint _term, uint _discountRate, uint _collateralRatio, uint _minDisbursedAmount,
        uint _defaultingFee, bool _isActive)
    external restrict("MonetaryBoard") returns (uint newProductId) {
        newProductId = products.push(
            LoanProduct(_term, _discountRate, _collateralRatio, _minDisbursedAmount, _defaultingFee, _isActive)
        ) - 1;

        LoanProductAdded(newProductId);
        return newProductId;
    }

    function setLoanProductActiveState(uint8 productId, bool newState)
    external restrict ("MonetaryBoard") {
        products[productId].isActive = false;
        LoanProductActiveStateChanged(productId, newState);
    }

    function newEthBackedLoan(uint8 productId) external payable {
        require(products[productId].isActive); // valid productId?

        // calculate loan values based on ETH sent in with Tx
        uint tokenValue = rates.convertFromWei(augmintToken.peggedSymbol(), msg.value);
        uint repaymentAmount = tokenValue.mul(products[productId].collateralRatio).roundedDiv(100000000);
        repaymentAmount = repaymentAmount * 100;    // rounding 4 decimals value to 2 decimals.
                                                    // no safe mul needed b/c of prev divide

        uint mul = products[productId].collateralRatio.mul(products[productId].discountRate) / 1000000;
        uint loanAmount = tokenValue.mul(mul).roundedDiv(100000000);
        loanAmount = loanAmount * 100;  // rounding 4 decimals value to 2 decimals.
                                        // no safe mul needed b/c of prev divide

        require(loanAmount >= products[productId].minDisbursedAmount);
        uint interestAmount = loanAmount > repaymentAmount ? 0 : repaymentAmount.sub(loanAmount);

        // Create new loan
        uint loanId = loans.push(
            LoanData(msg.sender, LoanState.Open, msg.value, repaymentAmount, loanAmount,
                interestAmount, products[productId].term, now, now + products[productId].term,
                products[productId].defaultingFeePt)
            ) - 1;

        // Store ref to new loan
        mLoans[msg.sender].push(loanId);

        // Issue tokens and send to borrower
        monetarySupervisor.issueLoan(msg.sender, loanAmount);

        NewLoan(productId, loanId, msg.sender, msg.value, loanAmount, repaymentAmount);
    }

    function collect(uint[] loanIds) external {
        /* when there are a lots of loans to be collected then
             the client need to call it in batches to make sure tx won't exceed block gas limit.
         Anyone can call it - can't cause harm as it only allows to collect loans which they are defaulted
         TODO: optimise defaulting fee calculations
        */
        uint totalLoanAmountCollected;
        for (uint i = 0; i < loanIds.length; i++) {
            uint loanId = loanIds[i];
            require(loans[loanId].state == LoanState.Open);
            require(now >= loans[loanId].maturity);

            totalLoanAmountCollected = totalLoanAmountCollected.add(loans[loanId].loanAmount);

            loans[loanId].state = LoanState.Defaulted;

            // send ETH collateral to augmintToken reserve
            uint defaultingFeeInToken = loans[loanId].repaymentAmount.mul(loans[loanId].defaultingFeePt).div(1000000);
            uint defaultingFee = rates.convertToWei(augmintToken.peggedSymbol(), defaultingFeeInToken);
            uint targetCollection = rates.convertToWei(augmintToken.peggedSymbol(), loans[loanId].repaymentAmount)
                .add(defaultingFee);
            uint releasedCollateral;
            if (targetCollection < loans[loanId].collateralAmount) {
                releasedCollateral = loans[loanId].collateralAmount.sub(targetCollection);
                loans[loanId].borrower.transfer(releasedCollateral);
            }
            uint collectedCollateral = loans[loanId].collateralAmount.sub(releasedCollateral);
            if (defaultingFee > collectedCollateral) {
                defaultingFee = collectedCollateral;
            }

            address(augmintToken).transfer(collectedCollateral);

            LoanCollected(loanId, loans[loanId].borrower, collectedCollateral, releasedCollateral, defaultingFee);
        }

        monetarySupervisor.loanCollectionNotification(totalLoanAmountCollected);// update KPIs

    }

    function getLoanCount() external view returns (uint ct) {
        return loans.length;
    }

    function getProductCount() external view returns (uint ct) {
        return products.length;
    }

    function getLoanIds(address borrower) external view returns (uint[] _loans) {
        return mLoans[borrower];
    }

    /* repay loan, called from AugmintToken's transferAndNotify
     Flow for repaying loan:
        1) user calls token contract's transferAndNotify loanId passed in data arg
        2) transferAndNotify transfers tokens to the Lender contract
        3) transferAndNotify calls Lender.transferNotification with lockProductId
    */
    // from arg is not used as we allow anyone to repay a loan:
    function transferNotification(address, uint repaymentAmount, uint loanId) public {
        require(msg.sender == address(augmintToken));
        _repayLoan(loanId, repaymentAmount);
    }

    /* internal function, assuming repayment amount already transfered  */
    function _repayLoan(uint loanId, uint repaymentAmount) internal {
        require(loans[loanId].state == LoanState.Open);
        require(now <= loans[loanId].maturity);
        require(loans[loanId].repaymentAmount == repaymentAmount);
        loans[loanId].state = LoanState.Repaid;

        augmintToken.transfer(interestEarnedAccount, loans[loanId].interestAmount);
        monetarySupervisor.burnLoan(loans[loanId].loanAmount); // burn repayment & update KPIs

        loans[loanId].borrower.transfer(loans[loanId].collateralAmount); // send back ETH collateral

        LoanRepayed(loanId, loans[loanId].borrower);
    }

}
