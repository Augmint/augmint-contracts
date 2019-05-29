/*
    Contract to manage Augmint token loan contracts backed by ETH
    For flows see: https://github.com/Augmint/augmint-contracts/blob/master/docs/loanFlow.png

    TODO:
        - create MonetarySupervisor interface and use it instead?
        - make data arg generic bytes?
        - make collect() run as long as gas provided allows
*/
pragma solidity 0.4.24;

import "./Rates.sol";
import "./generic/Restricted.sol";
import "./generic/SafeMath.sol";
import "./interfaces/AugmintTokenInterface.sol";
import "./MonetarySupervisor.sol";


contract LoanManager is Restricted, TokenReceiver {
    using SafeMath for uint256;

    enum LoanState { Open, Repaid, Defaulted, Collected } // NB: Defaulted state is not stored, only getters calculate

    struct LoanProduct {
        uint minDisbursedAmount;    // 0: minimum loanAmount, with decimals set in AugmintToken.decimals (i.e. token amount)
        uint32 term;                // 1: term length (in seconds)
        uint32 discountRate;        // 2: discountRate (in parts per million, i.e. 10,000 = 1%)
        uint32 collateralRatio;     // 3: repayment (token amount) / collateral (token amount), (in parts per million, i.e. 10,000 = 1%)
        uint32 defaultingFeePt;     // 4: % of repaymentAmount (in parts per million, i.e. 50,000 = 5%)
        bool isActive;              // 5: flag to enable/disable product
        uint32 marginRatio;         // 6: ... (in ppm), zero means no margin
    }

    /* NB: we don't need to store loan parameters because loan products can't be altered (only disabled/enabled) */
    struct LoanData {
        uint collateralAmount; // 0
        uint repaymentAmount; // 1
        address borrower; // 2
        uint32 productId; // 3
        LoanState state; // 4
        uint40 maturity; // 5
        uint marginCallRate; // 6: the token/ETH rate of the margin for this loan, under which it can be "margin called" (collected)
    }

    LoanProduct[] public products;

    LoanData[] public loans;
    mapping(address => uint[]) public accountLoans;  // owner account address =>  array of loan Ids

    Rates public rates; // instance of token/ETH rate provider contract
    AugmintTokenInterface public augmintToken; // instance of token contract
    MonetarySupervisor public monetarySupervisor;

    event NewLoan(uint32 productId, uint loanId, address indexed borrower, uint collateralAmount, uint loanAmount,
        uint repaymentAmount, uint40 maturity);

    event LoanProductActiveStateChanged(uint32 productId, bool newState);

    event LoanProductAdded(uint32 productId);

    event LoanRepayed(uint loanId, address borrower);

    event LoanCollected(uint loanId, address indexed borrower, uint collectedCollateral,
        uint releasedCollateral, uint defaultingFee);

    event SystemContractsChanged(Rates newRatesContract, MonetarySupervisor newMonetarySupervisor);

    constructor(address permissionGranterContract, AugmintTokenInterface _augmintToken,
                    MonetarySupervisor _monetarySupervisor, Rates _rates)
    public Restricted(permissionGranterContract) {
        augmintToken = _augmintToken;
        monetarySupervisor = _monetarySupervisor;
        rates = _rates;
    }

    /* @Deprecated: For compatibility with previous versions (without the margin parameter), e.g. old SB scripts */
    function addLoanProduct(uint32 term, uint32 discountRate, uint32 collateralRatio, uint minDisbursedAmount,
                                uint32 defaultingFeePt, bool isActive)
    external restrict("StabilityBoard") {
        _addLoanProduct(term, discountRate, collateralRatio, minDisbursedAmount, defaultingFeePt, isActive, 0);
    }

    /* New version, with the margin parameter */
    function addLoanProduct(uint32 term, uint32 discountRate, uint32 collateralRatio, uint minDisbursedAmount,
                                uint32 defaultingFeePt, bool isActive, uint32 marginRatio)
    external restrict("StabilityBoard") {
        _addLoanProduct(term, discountRate, collateralRatio, minDisbursedAmount, defaultingFeePt, isActive, marginRatio);
    }

    /* Internal function for both addLoanProduct-s */
    function _addLoanProduct(uint32 term, uint32 discountRate, uint32 collateralRatio, uint minDisbursedAmount,
                                uint32 defaultingFeePt, bool isActive, uint32 marginRatio)
    internal restrict("StabilityBoard") {
        uint _newProductId = products.push(
            LoanProduct(minDisbursedAmount, term, discountRate, collateralRatio, defaultingFeePt, isActive, marginRatio)
        ) - 1;

        uint32 newProductId = uint32(_newProductId);
        require(newProductId == _newProductId, "productId overflow");

        emit LoanProductAdded(newProductId);
    }

    function setLoanProductActiveState(uint32 productId, bool newState)
    external restrict ("StabilityBoard") {
        require(productId < products.length, "invalid productId"); // next line would revert but require to emit reason
        products[productId].isActive = newState;
        emit LoanProductActiveStateChanged(productId, newState);
    }

    function newEthBackedLoan(uint32 productId) external payable {
        require(productId < products.length, "invalid productId"); // next line would revert but require to emit reason
        LoanProduct storage product = products[productId];
        require(product.isActive, "product must be in active state"); // valid product


        // calculate loan values based on ETH sent in with Tx
        uint tokenValue = rates.convertFromWei(augmintToken.peggedSymbol(), msg.value);
        uint repaymentAmount = tokenValue.mul(product.collateralRatio).div(1000000);

        uint loanAmount;
        (loanAmount, ) = calculateLoanValues(product, repaymentAmount);

        require(loanAmount >= product.minDisbursedAmount, "loanAmount must be >= minDisbursedAmount");

        uint expiration = now.add(product.term);
        uint40 maturity = uint40(expiration);
        require(maturity == expiration, "maturity overflow");

        uint marginRate = 0;
        if (product.marginRatio > 0) {
            marginRate = calculateMarginRate(product.marginRatio, repaymentAmount, msg.value);
        }

        // Create new loan
        uint loanId = loans.push(
            LoanData(msg.value, repaymentAmount, msg.sender, productId, LoanState.Open, maturity, marginRate)
        ) - 1;

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
        require(msg.sender == address(augmintToken), "msg.sender must be augmintToken");

        _repayLoan(loanId, repaymentAmount);
    }

    function collect(uint[] loanIds) external {
        (uint currentRate, ) = rates.rates(augmintToken.peggedSymbol());
        require(currentRate > 0, "No current rate available");

        /* when there are a lots of loans to be collected then
             the client need to call it in batches to make sure tx won't exceed block gas limit.
         Anyone can call it - can't cause harm as it only allows to collect loans which they are defaulted
         TODO: optimise defaulting fee calculations
        */
        uint totalLoanAmountCollected;
        uint totalCollateralToCollect;
        uint totalDefaultingFee;
        for (uint i = 0; i < loanIds.length; i++) {
            (uint loanAmount, uint defaultingFee, uint collateralToCollect) = _collectLoan(loanIds[i], currentRate);
            totalLoanAmountCollected = totalLoanAmountCollected.add(loanAmount);
            totalDefaultingFee = totalDefaultingFee.add(defaultingFee);
            totalCollateralToCollect = totalCollateralToCollect.add(collateralToCollect);
        }

        if (totalCollateralToCollect > 0) {
            address(monetarySupervisor.augmintReserves()).transfer(totalCollateralToCollect);
        }

        if (totalDefaultingFee > 0) {
            address(augmintToken.feeAccount()).transfer(totalDefaultingFee);
        }

        monetarySupervisor.loanCollectionNotification(totalLoanAmountCollected);// update KPIs

    }

    /* to allow upgrade of Rates and MonetarySupervisor contracts */
    function setSystemContracts(Rates newRatesContract, MonetarySupervisor newMonetarySupervisor)
    external restrict("StabilityBoard") {
        rates = newRatesContract;
        monetarySupervisor = newMonetarySupervisor;
        emit SystemContractsChanged(newRatesContract, newMonetarySupervisor);
    }

    function getProductCount() external view returns (uint) {
        return products.length;
    }

    // returns <chunkSize> loan products starting from some <offset>:
    // [ productId, minDisbursedAmount, term, discountRate, collateralRatio, defaultingFeePt, maxLoanAmount, isActive, marginRatio ]
    function getProducts(uint offset, uint16 chunkSize)
    external view returns (uint[9][]) {
        uint limit = SafeMath.min(offset.add(chunkSize), products.length);
        uint[9][] memory response = new uint[9][](limit.sub(offset));

        for (uint i = offset; i < limit; i++) {
            LoanProduct storage product = products[i];
            response[i - offset] = [i, product.minDisbursedAmount, product.term, product.discountRate,
                    product.collateralRatio, product.defaultingFeePt,
                    monetarySupervisor.getMaxLoanAmount(product.minDisbursedAmount), product.isActive ? 1 : 0,
                    product.marginRatio];
        }
        return response;
    }

    function getLoanCount() external view returns (uint) {
        return loans.length;
    }

    /* returns <chunkSize> loans starting from some <offset>. Loans data encoded as:
        [loanId, collateralAmount, repaymentAmount, borrower, productId,
              state, maturity, disbursementTime, loanAmount, interestAmount, marginCallRate] */
    function getLoans(uint offset, uint16 chunkSize)
    external view returns (uint[11][]) {
        uint limit = SafeMath.min(offset.add(chunkSize), loans.length);
        uint[11][] memory response = new uint[11][](limit.sub(offset));

        for (uint i = offset; i < limit; i++) {
            response[i - offset] = getLoanTuple(i);
        }
        return response;
    }

    function getLoanCountForAddress(address borrower) external view returns (uint) {
        return accountLoans[borrower].length;
    }

    /* returns <chunkSize> loans of a given account, starting from some <offset>. Loans data encoded as:
        [loanId, collateralAmount, repaymentAmount, borrower, productId, state, maturity, disbursementTime,
                                                            loanAmount, interestAmount, marginCallRate] */
    function getLoansForAddress(address borrower, uint offset, uint16 chunkSize)
    external view returns (uint[11][]) {
        uint[] storage loansForAddress = accountLoans[borrower];
        uint limit = SafeMath.min(offset.add(chunkSize), loansForAddress.length);
        uint[11][] memory response = new uint[11][](limit.sub(offset));

        for (uint i = offset; i < limit; i++) {
            response[i - offset] = getLoanTuple(loansForAddress[i]);
        }
        return response;
    }

    function getLoanTuple(uint loanId) public view returns (uint[11] result) {
        require(loanId < loans.length, "invalid loanId"); // next line would revert but require to emit reason
        LoanData storage loan = loans[loanId];
        LoanProduct storage product = products[loan.productId];

        uint loanAmount;
        uint interestAmount;
        (loanAmount, interestAmount) = calculateLoanValues(product, loan.repaymentAmount);
        uint disbursementTime = loan.maturity - product.term;

        LoanState loanState =
                loan.state == LoanState.Open && now >= loan.maturity ? LoanState.Defaulted : loan.state;

        result = [loanId, loan.collateralAmount, loan.repaymentAmount, uint(loan.borrower),
            loan.productId, uint(loanState), loan.maturity, disbursementTime, loanAmount, interestAmount, loan.marginCallRate];
    }

    function calculateLoanValues(LoanProduct storage product, uint repaymentAmount)
    internal view returns (uint loanAmount, uint interestAmount) {
        // calculate loan values based on repayment amount
        loanAmount = repaymentAmount.mul(product.discountRate).div(1000000);
        interestAmount = loanAmount > repaymentAmount ? 0 : repaymentAmount.sub(loanAmount);
    }

    function calculateMarginRate(uint32 marginRatio, uint repaymentAmount, uint collateralAmount)
    internal pure returns (uint) {
        // TODO: think about proper div rounding to use here
        return uint(marginRatio).mul(repaymentAmount).div(collateralAmount.mul(1000000));
    }

    function isUnderMargin(LoanData storage loan, uint currentRate)
    internal view returns (bool) {
        return loan.marginCallRate > 0 && currentRate < loan.marginCallRate;
    }

    /* internal function, assuming repayment amount already transfered  */
    function _repayLoan(uint loanId, uint repaymentAmount) internal {
        require(loanId < loans.length, "invalid loanId"); // next line would revert but require to emit reason
        LoanData storage loan = loans[loanId];
        require(loan.state == LoanState.Open, "loan state must be Open");
        require(repaymentAmount == loan.repaymentAmount, "repaymentAmount must be equal to tokens sent");
        require(now <= loan.maturity, "current time must be earlier than maturity");

        LoanProduct storage product = products[loan.productId];
        uint loanAmount;
        uint interestAmount;
        (loanAmount, interestAmount) = calculateLoanValues(product, loan.repaymentAmount);

        loans[loanId].state = LoanState.Repaid;

        if (interestAmount > 0) {
            augmintToken.transfer(monetarySupervisor.interestEarnedAccount(), interestAmount);
            augmintToken.burn(loanAmount);
        } else {
            // negative or zero interest (i.e. discountRate >= 0)
            augmintToken.burn(repaymentAmount);
        }

        monetarySupervisor.loanRepaymentNotification(loanAmount); // update KPIs

        loan.borrower.transfer(loan.collateralAmount); // send back ETH collateral

        emit LoanRepayed(loanId, loan.borrower);
    }

    function _collectLoan(uint loanId, uint currentRate) private returns(uint loanAmount, uint defaultingFee, uint collateralToCollect) {
        LoanData storage loan = loans[loanId];
        require(loan.state == LoanState.Open, "loan state must be Open");
        require(now >= loan.maturity || isUnderMargin(loan, currentRate), "Not collectable");
        LoanProduct storage product = products[loan.productId];

        (loanAmount, ) = calculateLoanValues(product, loan.repaymentAmount);

        loan.state = LoanState.Collected;

        // send ETH collateral to augmintToken reserve
        // uint defaultingFeeInToken = loan.repaymentAmount.mul(product.defaultingFeePt).div(1000000);
        defaultingFee = _convertToWei(currentRate, loan.repaymentAmount.mul(product.defaultingFeePt).div(1000000));
        uint targetCollection = _convertToWei(currentRate, loan.repaymentAmount).add(defaultingFee);

        uint releasedCollateral;
        if (targetCollection < loan.collateralAmount) {
            releasedCollateral = loan.collateralAmount.sub(targetCollection);
            loan.borrower.transfer(releasedCollateral);
        }
        collateralToCollect = loan.collateralAmount.sub(releasedCollateral);
        if (defaultingFee >= collateralToCollect) {
            defaultingFee = collateralToCollect;
            collateralToCollect = 0;
        } else {
            collateralToCollect = collateralToCollect.sub(defaultingFee);
        }

        emit LoanCollected(loanId, loan.borrower, collateralToCollect.add(defaultingFee),
                releasedCollateral, defaultingFee);
    }

    function _convertToWei(uint rate, uint value) private pure returns(uint weiValue) {
        return value.mul(1000000000000000000).roundedDiv(rate);
    }

}
