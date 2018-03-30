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
pragma solidity 0.4.21;

import "./Rates.sol";
import "./generic/Restricted.sol";
import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./InterestEarnedAccount.sol";
import "./MonetarySupervisor.sol";


contract LoanManager is Restricted {
    using SafeMath for uint256;

    uint16 public constant CHUNK_SIZE = 100;

    enum LoanState { Open, Repaid, Defaulted, Collected } // NB: Defaulted state is not stored, only getters calculate

    struct LoanProduct {
        uint minDisbursedAmount; // 0: with decimals set in AugmintToken.decimals
        uint32 term;            // 1
        uint32 discountRate;    // 2: discountRate in parts per million , ie. 10,000 = 1%
        uint32 collateralRatio; // 3: loan token amount / colleteral pegged ccy value
                                //      in parts per million , ie. 10,000 = 1%
        uint32 defaultingFeePt; // 4: % of collateral in parts per million , ie. 50,000 = 5%
        bool isActive;          // 5
    }

    /* NB: we don't need to store loan parameters because loan products can't be altered (only disabled/enabled) */
    struct LoanData {
        uint collateralAmount; // 0
        uint repaymentAmount; // 1
        address borrower; // 2
        uint32 productId; // 3
        LoanState state; // 4
        uint40 maturity; // 5
    }

    LoanProduct[] public products;

    LoanData[] public loans;
    mapping(address => uint[]) public accountLoans;  // owner account address =>  array of loan Ids

    Rates public rates; // instance of ETH/pegged currency rate provider contract
    AugmintTokenInterface public augmintToken; // instance of token contract
    MonetarySupervisor public monetarySupervisor;
    InterestEarnedAccount public interestEarnedAccount;

    event NewLoan(uint32 productId, uint loanId, address indexed borrower, uint collateralAmount, uint loanAmount,
        uint repaymentAmount, uint40 maturity);

    event LoanProductActiveStateChanged(uint32 productId, bool newState);

    event LoanProductAdded(uint32 productId);

    event LoanRepayed(uint loanId, address borrower);

    event LoanCollected(uint loanId, address indexed borrower, uint collectedCollateral,
        uint releasedCollateral, uint defaultingFee);

    function LoanManager(AugmintTokenInterface _augmintToken, MonetarySupervisor _monetarySupervisor, Rates _rates,
                            InterestEarnedAccount _interestEarnedAccount)
    public {
        augmintToken = _augmintToken;
        monetarySupervisor = _monetarySupervisor;
        rates = _rates;
        interestEarnedAccount = _interestEarnedAccount;
    }

    function addLoanProduct(uint32 term, uint32 discountRate, uint32 collateralRatio, uint minDisbursedAmount,
                                uint32 defaultingFeePt, bool isActive)
    external restrict("MonetaryBoard") {

        uint _newProductId = products.push(
            LoanProduct(minDisbursedAmount, term, discountRate, collateralRatio, defaultingFeePt, isActive)
        ) - 1;

        uint32 newProductId = uint32(_newProductId);
        require(newProductId == _newProductId);

        emit LoanProductAdded(newProductId);
    }

    function setLoanProductActiveState(uint32 productId, bool newState)
    external restrict ("MonetaryBoard") {
        products[productId].isActive = false;
        emit LoanProductActiveStateChanged(productId, newState);
    }

    function newEthBackedLoan(uint32 productId) external payable {
        LoanProduct storage product = products[productId];
        require(product.isActive); // valid productId?

        // calculate loan values based on ETH sent in with Tx
        uint tokenValue = rates.convertFromWei(augmintToken.peggedSymbol(), msg.value);
        uint repaymentAmount = tokenValue.mul(product.collateralRatio).div(1000000);

        uint loanAmount;
        (loanAmount, ) = calculateLoanValues(product, repaymentAmount);

        require(loanAmount >= product.minDisbursedAmount);

        uint expiration = now.add(product.term);
        uint40 maturity = uint40(expiration);
        require(maturity == expiration);

        // Create new loan
        uint loanId = loans.push(LoanData(msg.value, repaymentAmount, msg.sender,
                                            productId, LoanState.Open, maturity)) - 1;

        // Store ref to new loan
        accountLoans[msg.sender].push(loanId);

        // Issue tokens and send to borrower
        monetarySupervisor.issueLoan(msg.sender, loanAmount);

        emit NewLoan(productId, loanId, msg.sender, msg.value, loanAmount, repaymentAmount, maturity);
    }

    /* repay loan, called from AugmintToken's transferAndNotify
     Flow for repaying loan:
        1) user calls token contract's transferAndNotify loanId passed in data arg
        2) transferAndNotify transfers tokens to the Lender contract
        3) transferAndNotify calls Lender.transferNotification with lockProductId
    */
    // from arg is not used as we allow anyone to repay a loan:
    function transferNotification(address, uint repaymentAmount, uint loanId) external {
        require(msg.sender == address(augmintToken));
        _repayLoan(loanId, repaymentAmount);
    }

    function collect(uint[] loanIds) external {
        /* when there are a lots of loans to be collected then
             the client need to call it in batches to make sure tx won't exceed block gas limit.
         Anyone can call it - can't cause harm as it only allows to collect loans which they are defaulted
         TODO: optimise defaulting fee calculations
        */
        uint totalLoanAmountCollected;
        uint totalCollateralToCollect;
        for (uint i = 0; i < loanIds.length; i++) {
            LoanData storage loan = loans[loanIds[i]];
            require(loan.state == LoanState.Open);
            require(now >= loan.maturity);
            LoanProduct storage product = products[loan.productId];

            uint loanAmount;
            (loanAmount, ) = calculateLoanValues(product, loan.repaymentAmount);

            totalLoanAmountCollected = totalLoanAmountCollected.add(loanAmount);

            loan.state = LoanState.Collected;

            // send ETH collateral to augmintToken reserve
            uint defaultingFeeInToken = loan.repaymentAmount.mul(product.defaultingFeePt).div(1000000);
            uint defaultingFee = rates.convertToWei(augmintToken.peggedSymbol(), defaultingFeeInToken);
            uint targetCollection = rates.convertToWei(augmintToken.peggedSymbol(),
                                                            loan.repaymentAmount).add(defaultingFee);

            uint releasedCollateral;
            if (targetCollection < loan.collateralAmount) {
                releasedCollateral = loan.collateralAmount.sub(targetCollection);
                loan.borrower.transfer(releasedCollateral);
            }
            uint collateralToCollect = loan.collateralAmount.sub(releasedCollateral);
            if (defaultingFee > collateralToCollect) {
                defaultingFee = collateralToCollect;
            }

            totalCollateralToCollect = totalCollateralToCollect.add(collateralToCollect);

            emit LoanCollected(loanIds[i], loan.borrower, collateralToCollect, releasedCollateral, defaultingFee);
        }

        if (totalCollateralToCollect > 0) {
            monetarySupervisor.augmintReserves().transfer(totalCollateralToCollect);
        }

        monetarySupervisor.loanCollectionNotification(totalLoanAmountCollected);// update KPIs

    }

    function getProductCount() external view returns (uint ct) {
        return products.length;
    }

    // returns CHUNK_SIZE loan products starting from some offset:
    // [ productId, minDisbursedAmount, term, discountRate, collateralRatio, defaultingFeePt, isActive ]
    function getProducts(uint offset) external view returns (uint[7][CHUNK_SIZE] response) {
        for (uint16 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= products.length) { break; }

            LoanProduct storage product = products[offset + i];

            response[i] = [offset + i, product.minDisbursedAmount, product.term, product.discountRate,
                                product.collateralRatio, product.defaultingFeePt, product.isActive ? 1 : 0 ];
        }
    }

    function getLoanCount() external view returns (uint ct) {
        return loans.length;
    }

    /* returns CHUNK_SIZE loans starting from some offset. Loans data encoded as:
        [loanId, collateralAmount, repaymentAmount, borrower, productId, state, maturity, disbursementTime,
                                                                                    loanAmount, interestAmount ]   */
    function getLoans(uint offset) external view returns (uint[10][CHUNK_SIZE] response) {

        for (uint16 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= loans.length) { break; }

            response[i] = getLoanTuple(offset + i);
        }
    }

    function getLoanCountForAddress(address borrower) external view returns (uint) {
        return accountLoans[borrower].length;
    }

    /* returns CHUNK_SIZE loans of a given account, starting from some offset. Loans data encoded as:
        [loanId, collateralAmount, repaymentAmount, borrower, productId, state, maturity, disbursementTime,
                                                                                    loanAmount, interestAmount ] */
    function getLoansForAddress(address borrower, uint offset) external view returns (uint[10][CHUNK_SIZE] response) {

        uint[] storage loansForAddress = accountLoans[borrower];

        for (uint16 i = 0; i < CHUNK_SIZE; i++) {

            if (offset + i >= loansForAddress.length) { break; }

            response[i] = getLoanTuple(loansForAddress[offset + i]);
        }
    }

    function getLoanTuple(uint loanId) public view returns (uint[10] result) {
        LoanData storage loan = loans[loanId];
        LoanProduct storage product = products[loan.productId];

        uint loanAmount;
        uint interestAmount;
        (loanAmount, interestAmount) = calculateLoanValues(product, loan.repaymentAmount);
        uint disbursementTime = loan.maturity - product.term;

        LoanState loanState =
                        loan.state == LoanState.Open && now >= loan.maturity ? LoanState.Defaulted : loan.state;

        result = [loanId, loan.collateralAmount, loan.repaymentAmount, uint(loan.borrower),
                    loan.productId, uint(loanState), loan.maturity, disbursementTime, loanAmount, interestAmount];
    }

    function calculateLoanValues(LoanProduct storage product, uint repaymentAmount)
    internal view returns (uint loanAmount, uint interestAmount) {
        // calculate loan values based on repayment amount
        loanAmount = repaymentAmount.mul(product.discountRate).div(1000000);
        interestAmount = loanAmount > repaymentAmount ? 0 : repaymentAmount.sub(loanAmount);
    }

    /* internal function, assuming repayment amount already transfered  */
    function _repayLoan(uint loanId, uint repaymentAmount) internal {
        LoanData storage loan = loans[loanId];
        require(loan.state == LoanState.Open);
        require(repaymentAmount == loan.repaymentAmount);
        require(now <= loan.maturity);

        LoanProduct storage product = products[loan.productId];
        uint loanAmount;
        uint interestAmount;
        (loanAmount, interestAmount) = calculateLoanValues(product, loan.repaymentAmount);

        loans[loanId].state = LoanState.Repaid;

        if (interestAmount > 0) {
            augmintToken.transfer(interestEarnedAccount, interestAmount);
            augmintToken.burn(loanAmount);
        } else {
            // negative or zero interest (i.e. discountRate >= 0)
            augmintToken.burn(repaymentAmount);
        }

        monetarySupervisor.loanRepaymentNotification(loanAmount); // update KPIs

        loan.borrower.transfer(loan.collateralAmount); // send back ETH collateral

        emit LoanRepayed(loanId, loan.borrower);
    }

}
