const BigNumber = require("bignumber.js");
const moment = require("moment");

const LoanManager = artifacts.require("./LoanManager.sol");
const Rates = artifacts.require("./Rates.sol");

const tokenTestHelpers = require("./tokenTestHelpers.js");
const testHelpers = require("./testHelpers.js");

const NEWLOAN_MAX_GAS = 220000;
const REPAY_MAX_GAS = 120000;
const COLLECT_BASE_GAS = 100000;

let augmintToken = null;
let monetarySupervisor = null;
let loanManager = null;
let rates = null;
let peggedSymbol = null;
let reserveAcc = null;
let interestEarnedAcc = null;

module.exports = {
    createLoan,
    repayLoan,
    collectLoan,
    getProductsInfo,
    parseLoansInfo,
    calcLoanValues,
    loanAsserts,
    get loanManager() {
        return loanManager;
    }
};

before(async function() {
    loanManager = LoanManager.at(LoanManager.address);
    augmintToken = tokenTestHelpers.augmintToken;
    monetarySupervisor = tokenTestHelpers.monetarySupervisor;

    reserveAcc = tokenTestHelpers.augmintReserves.address;
    interestEarnedAcc = tokenTestHelpers.interestEarnedAccount.address;
    peggedSymbol = tokenTestHelpers.peggedSymbol;

    rates = Rates.at(Rates.address);
});

async function createLoan(testInstance, product, borrower, collateralWei, minRate = 0) {
    const loan = await calcLoanValues(rates, product, collateralWei);
    loan.state = 0;
    loan.borrower = borrower;
    const [totalSupplyBefore, totalLoanAmountBefore, balBefore] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        tokenTestHelpers.getAllBalances({
            reserve: reserveAcc,
            borrower: loan.borrower,
            loanManager: loanManager.address,
            interestEarned: interestEarnedAcc
        })
    ]);

    const tx = await loanManager.newEthBackedLoan(loan.product.id, minRate, {
        from: loan.borrower,
        value: loan.collateralAmount
    });
    testHelpers.logGasUse(testInstance, tx, "newEthBackedLoan");

    const [newLoanEvenResult, ,] = await Promise.all([
        testHelpers.assertEvent(loanManager, "NewLoan", {
            loanId: x => x,
            productId: loan.product.id.toNumber(),
            borrower: loan.borrower,
            collateralAmount: loan.collateralAmount.toString(),
            loanAmount: loan.loanAmount.toString(),
            repaymentAmount: loan.repaymentAmount.toString(),
            maturity: x => x,
            currentRate: x => x
        }),

        testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
            from: testHelpers.NULL_ACC,
            to: loan.borrower,
            amount: loan.loanAmount.toString(),
            fee: 0,
            narrative: ""
        })

        // TODO: it's emmited  but why  not picked up by assertEvent?
        // testHelpers.assertEvent(augmintToken, "Transfer", {
        //     from: augmintToken.address,
        //     to: expLoan.borrower,
        //     amount: expLoan.loanAmount.toString()
        // })
    ]);

    loan.id = newLoanEvenResult.loanId.toNumber();
    loan.maturity = newLoanEvenResult.maturity.toNumber();
    loan.currentRate = newLoanEvenResult.currentRate.toNumber();

    const [totalSupplyAfter, totalLoanAmountAfter, ,] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        loanAsserts(loan),

        tokenTestHelpers.assertBalances(balBefore, {
            reserve: {},
            borrower: {
                ace: balBefore.borrower.ace.add(loan.loanAmount),
                eth: balBefore.borrower.eth.minus(loan.collateralAmount),
                gasFee: NEWLOAN_MAX_GAS * testHelpers.GAS_PRICE
            },
            loanManager: {
                eth: balBefore.loanManager.eth.plus(loan.collateralAmount)
            },
            interestEarned: {}
        })
    ]);

    assert.equal(
        totalSupplyAfter.toString(),
        totalSupplyBefore.add(loan.loanAmount).toString(),
        "total ACE supply should be increased by the disbursed loan amount"
    );
    assert.equal(
        totalLoanAmountAfter.toString(),
        totalLoanAmountBefore.add(loan.loanAmount).toString(),
        "total loan amount should be increased by the loan amount"
    );
    return loan;
}

async function repayLoan(testInstance, loan) {
    const [totalSupplyBefore, totalLoanAmountBefore, balBefore] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),
        tokenTestHelpers.getAllBalances({
            reserve: reserveAcc,
            borrower: loan.borrower,
            loanManager: loanManager.address,
            interestEarned: interestEarnedAcc
        })
    ]);

    loan.state = 1; // repaid
    const tx = await augmintToken.transferAndNotify(loanManager.address, loan.repaymentAmount, loan.id, {
        from: loan.borrower
    });
    testHelpers.logGasUse(testInstance, tx, "transferAndNotify - repayLoan");

    const [totalSupplyAfter, totalLoanAmountAfter, , , ,] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        testHelpers.assertEvent(loanManager, "LoanRepaid", {
            loanId: loan.id,
            borrower: loan.borrower,
            currentRate: x => x
        }),

        /* TODO: these are emmited  but why not picked up by assertEvent? */
        // testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
        //     from: loan.borrower,
        //     to: loanManager.address,
        //     amount: loan.repaymentAmount.toString(),
        //     fee: 0,
        //     narrative: ""
        // }),
        // testHelpers.assertEvent(augmintToken, "Transfer", {
        //     from: loan.borrower,
        //     to: loanManager.address,
        //     amount: loan.repaymentAmount.toString()
        // }),

        loanAsserts(loan),

        tokenTestHelpers.assertBalances(balBefore, {
            reserve: {},
            borrower: {
                ace: balBefore.borrower.ace.sub(loan.repaymentAmount),
                eth: balBefore.borrower.eth.add(loan.collateralAmount),
                gasFee: REPAY_MAX_GAS * testHelpers.GAS_PRICE
            },
            loanManager: {
                eth: balBefore.loanManager.eth.minus(loan.collateralAmount)
            },
            interestEarned: {
                ace: balBefore.interestEarned.ace.add(loan.interestAmount)
            }
        })
    ]);

    assert.equal(
        totalSupplyAfter.toString(),
        totalSupplyBefore
            .sub(loan.repaymentAmount)
            .add(loan.interestAmount)
            .toString(),
        "total supply should be reduced by the repayment amount less interestAmount"
    );
    assert.equal(
        totalLoanAmountAfter.toString(),
        totalLoanAmountBefore.sub(loan.loanAmount).toString(),
        "total loan amount should be reduced by the loan amount"
    );
}

async function collectLoan(testInstance, loan, collector) {
    loan.collector = collector;
    loan.state = 3; // Collected

    const targetCollectionInToken = loan.repaymentAmount.mul(loan.product.defaultingFeePt.add(1000000)).div(1000000);
    const targetFeeInToken = loan.repaymentAmount.mul(loan.product.defaultingFeePt).div(1000000);
    //.round(0, BigNumber.ROUND_DOWN);

    const [
        totalSupplyBefore,
        totalLoanAmountBefore,
        balBefore,
        collateralInToken,
        repaymentAmountInWei,
        targetCollectionInWei,
        targetFeeInWei
    ] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        tokenTestHelpers.getAllBalances({
            reserve: reserveAcc,
            collector: loan.collector,
            borrower: loan.borrower,
            loanManager: loanManager.address,
            interestEarned: interestEarnedAcc,
            feeAccount: tokenTestHelpers.feeAccount
        }),
        rates.convertFromWei(peggedSymbol, loan.collateralAmount),
        rates.convertToWei(peggedSymbol, loan.repaymentAmount),
        rates.convertToWei(peggedSymbol, targetCollectionInToken),
        rates.convertToWei(peggedSymbol, targetFeeInToken)
    ]);

    const releasedCollateral = BigNumber.max(loan.collateralAmount.sub(targetCollectionInWei), 0);
    const collectedCollateral = loan.collateralAmount.sub(releasedCollateral);
    const defaultingFee = BigNumber.min(targetFeeInWei, collectedCollateral);

    // const rate = await rates.rates("EUR");
    // console.log(
    //     `    *** Collection params:
    //      A-EUR/EUR: ${rate[0] / 100}
    //      defaulting fee pt: ${loan.product.defaultingFeePt / 10000} %
    //      repaymentAmount: ${loan.repaymentAmount / 10000} A-EUR = ${repaymentAmountInWei / testHelpers.ONE_ETH} ETH
    //      collateral: ${loan.collateralAmount / testHelpers.ONE_ETH} ETH = ${collateralInToken / 100} A-EUR
    //      --------------------
    //      targetFee: ${targetFeeInToken / 100} A-EUR = ${targetFeeInWei / testHelpers.ONE_ETH} ETH
    //      target collection : ${targetCollectionInToken / 100} A-EUR = ${targetCollectionInWei / testHelpers.ONE_ETH} ETH
    //      collected: ${collectedCollateral / testHelpers.ONE_ETH} ETH
    //      released: ${releasedCollateral / testHelpers.ONE_ETH} ETH
    //      defaultingFee: ${defaultingFee / testHelpers.ONE_ETH} ETH`
    // );

    const tx = await loanManager.collect([loan.id], { from: loan.collector });

    testHelpers.logGasUse(testInstance, tx, "collect 1");

    const [totalSupplyAfter, totalLoanAmountAfter, , ,] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        testHelpers.assertEvent(loanManager, "LoanCollected", {
            loanId: loan.id,
            borrower: loan.borrower,
            collectedCollateral: collectedCollateral.toString(),
            releasedCollateral: releasedCollateral.toString(),
            defaultingFee: defaultingFee.toString(),
            currentRate: x => x
        }),

        loanAsserts(loan),

        tokenTestHelpers.assertBalances(balBefore, {
            reserve: {
                eth: balBefore.reserve.eth.add(collectedCollateral).sub(defaultingFee)
            },

            feeAccount: {
                eth: balBefore.feeAccount.eth.add(defaultingFee)
            },

            collector: {
                gasFee: COLLECT_BASE_GAS * testHelpers.GAS_PRICE
            },

            borrower: {
                eth: balBefore.borrower.eth.add(releasedCollateral)
            },

            loanManager: {
                eth: balBefore.loanManager.eth.minus(loan.collateralAmount)
            },

            interestEarned: {}
        })
    ]);

    assert.equal(totalSupplyAfter.toString(), totalSupplyBefore.toString(), "totalSupply should be the same");
    assert.equal(
        totalLoanAmountAfter.toString(),
        totalLoanAmountBefore.sub(loan.loanAmount).toString(),
        "total loan amount should be reduced by the loan amount"
    );
}

async function getProductsInfo(offset, chunkSize) {
    const products = await loanManager.getProducts(offset, chunkSize);
    assert(products.length <= chunkSize);
    const result = [];
    products.map(prod => {
        const [
            id,
            minDisbursedAmount,
            term,
            discountRate,
            initialCollateralRatio,
            defaultingFeePt,
            maxLoanAmount,
            isActive,
            minCollateralRatio
        ] = prod;
        assert(term.gt(0));
        result.push({
            id,
            minDisbursedAmount,
            term,
            discountRate,
            initialCollateralRatio,
            defaultingFeePt,
            maxLoanAmount,
            isActive,
            minCollateralRatio
        });
    });
    return result;
}

/* parse array returned by getLoans & getLoansForAddress */
function parseLoansInfo(loans) {
    const result = [];
    loans.map(loan => {
        const [
            id,
            collateralAmount,
            repaymentAmount,
            borrower,
            productId,
            state,
            maturity,
            disbursementTime,
            loanAmount,
            interestAmount,
            marginCallRate,
            isCollectable
        ] = loan;

        assert(maturity.gt(0));
        result.push({
            id,
            collateralAmount,
            repaymentAmount,
            borrower,
            productId,
            state,
            maturity,
            disbursementTime,
            loanAmount,
            interestAmount,
            marginCallRate,
            isCollectable
        });
    });
    return result;
}

async function calcLoanValues(rates, product, collateralWei) {
    const ret = {};
    const ppmDiv = 1000000;

    ret.collateralAmount = new BigNumber(collateralWei);
    ret.tokenValue = await rates.convertFromWei(peggedSymbol, collateralWei);

    ret.repaymentAmount = ret.tokenValue
        .mul(ppmDiv)
        .div(product.initialCollateralRatio)
        .round(0, BigNumber.ROUND_DOWN);

    ret.loanAmount = ret.repaymentAmount
        .mul(product.discountRate)
        .div(ppmDiv)
        .round(0, BigNumber.ROUND_UP);

    ret.interestAmount = ret.repaymentAmount.gt(ret.loanAmount)
        ? ret.repaymentAmount.minus(ret.loanAmount)
        : new BigNumber(0);

    ret.disbursementTime = moment()
        .utc()
        .unix();
    ret.product = product;

    return ret;
}

async function loanAsserts(expLoan) {
    const loan = await loanManager.loans(expLoan.id);
    assert.equal(loan[0].toString(), expLoan.collateralAmount.toString(), "collateralAmount should be set");
    assert.equal(loan[1].toString(), expLoan.repaymentAmount.toString(), "repaymentAmount should be set");
    assert.equal(loan[2], expLoan.borrower, "borrower should be set");
    assert.equal(loan[3].toNumber(), expLoan.product.id, "product id should be set");
    assert.equal(loan[4].toNumber(), expLoan.state, "loan state should be set");
    assert.equal(loan[5].toNumber(), expLoan.maturity, "maturity should be the same as in NewLoan event");

    const maturityActual = loan[5];
    const maturityExpected = expLoan.product.term.add(expLoan.disbursementTime).toNumber();

    assert(maturityActual >= maturityExpected, "maturity should be at least term + the time at disbursement");
    assert(
        maturityActual <= maturityExpected + 5,
        "maturity should be at most the term + time at disbursement + 5. Difference is: " +
            (maturityActual - maturityExpected)
    );
}
