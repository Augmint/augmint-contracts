const BigNumber = require("bignumber.js");
const moment = require("moment");

const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Rates = artifacts.require("./Rates.sol");

const tokenTestHelpers = require("./tokenTestHelpers.js");
const testHelpers = require("./testHelpers.js");

// these "constants" set in init because getPrice is async
let NEWLOAN_MAXFEE = null;
let REPAY_MAXFEE = null;
let COLLECT_BASEFEE = null;

const NULL_ACC = "0x0000000000000000000000000000000000000000";

let augmintToken = null;
let monetarySupervisor = null;
let loanManager = null;
let rates = null;
let peggedSymbol = null;
let reserveAcc = null;
let interestEarnedAcc = null;

module.exports = {
    initLoanManager,
    createLoan,
    repayLoan,
    collectLoan,
    getProductInfo,
    calcLoanValues,
    loanAsserts
};

async function initLoanManager() {
    NEWLOAN_MAXFEE = await testHelpers.getGasCost(350000);
    REPAY_MAXFEE = await testHelpers.getGasCost(150000);
    COLLECT_BASEFEE = await testHelpers.getGasCost(100000);

    loanManager = LoanManager.at(LoanManager.address);
    monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
    augmintToken = await tokenTestHelpers.initAugmintToken();
    rates = Rates.at(Rates.address);

    [peggedSymbol, reserveAcc, interestEarnedAcc] = await Promise.all([
        augmintToken.peggedSymbol(),
        monetarySupervisor.augmintReserves(),
        monetarySupervisor.interestEarnedAccount()
    ]);

    peggedSymbol = web3.toAscii(peggedSymbol);
    return loanManager;
}

async function createLoan(testInstance, product, borrower, collateralWei) {
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

    const tx = await loanManager.newEthBackedLoan(loan.product.id, {
        from: loan.borrower,
        value: loan.collateral
    });
    testHelpers.logGasUse(testInstance, tx, "newEthBackedLoan");

    const [newLoanEvenResult, ,] = await Promise.all([
        testHelpers.assertEvent(loanManager, "NewLoan", {
            loanId: x => x,
            productId: loan.product.id,
            borrower: loan.borrower,
            collateralAmount: loan.collateral.toString(),
            loanAmount: loan.loanAmount.toString(),
            repaymentAmount: loan.repaymentAmount.toString()
        }),

        testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
            from: NULL_ACC,
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

    const [totalSupplyAfter, totalLoanAmountAfter, ,] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        loanAsserts(loan),

        tokenTestHelpers.assertBalances(balBefore, {
            reserve: {},
            borrower: {
                ace: balBefore.borrower.ace.add(loan.loanAmount),
                eth: balBefore.borrower.eth.minus(loan.collateral),
                gasFee: NEWLOAN_MAXFEE
            },
            loanManager: {
                eth: balBefore.loanManager.eth.plus(loan.collateral)
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

        testHelpers.assertEvent(loanManager, "LoanRepayed", {
            loanId: loan.id,
            borrower: loan.borrower
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
                eth: balBefore.borrower.eth.add(loan.collateral),
                gasFee: REPAY_MAXFEE
            },
            loanManager: {
                eth: balBefore.loanManager.eth.minus(loan.collateral)
            },
            interestEarned: {
                ace: balBefore.interestEarned.ace.add(loan.interestAmount)
            }
        })
    ]);

    assert.equal(
        totalSupplyAfter.toString(),
        totalSupplyBefore.sub(loan.loanAmount).toString(),
        "total ACE supply should be reduced by the loan amount (what was disbursed)"
    );
    assert.equal(
        totalLoanAmountAfter.toString(),
        totalLoanAmountBefore.sub(loan.loanAmount).toString(),
        "total loan amount should be reduced by the loan amount"
    );
}

async function collectLoan(testInstance, loan, collector) {
    loan.collector = collector;
    loan.state = 2; // defaulted

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
            interestEarned: interestEarnedAcc
        }),
        rates.convertFromWei(peggedSymbol, loan.collateral),
        rates.convertToWei(peggedSymbol, loan.repaymentAmount),
        rates.convertToWei(peggedSymbol, targetCollectionInToken),
        rates.convertToWei(peggedSymbol, targetFeeInToken)
    ]);

    const releasedCollateral = BigNumber.max(loan.collateral.sub(targetCollectionInWei), 0);
    const collectedCollateral = loan.collateral.sub(releasedCollateral);
    const defaultingFee = BigNumber.min(targetFeeInWei, collectedCollateral);

    // const rate = await rates.rates("EUR");
    // console.log(
    //     `    *** Collection params:
    //      A-EUR/EUR: ${rate[0] / 10000}
    //      defaulting fee pt: ${loan.product.defaultingFeePt / 10000} %
    //      repaymentAmount: ${loan.repaymentAmount / 10000} A-EUR = ${web3.fromWei(repaymentAmountInWei)} ETH
    //      collateral: ${web3.fromWei(loan.collateral).toString()} ETH = ${collateralInToken / 10000} A-EUR
    //      --------------------
    //      targetFee: ${targetFeeInToken / 10000} A-EUR = ${web3.fromWei(targetFeeInWei).toString()} ETH
    //      target collection : ${targetCollectionInToken / 10000} A-EUR = ${web3
    // .fromWei(targetCollectionInWei)
    // .toString()} ETH
    //      collected: ${web3.fromWei(collectedCollateral).toString()} ETH
    //      released: ${web3.fromWei(releasedCollateral).toString()} ETH
    //      defaultingFee: ${web3.fromWei(defaultingFee).toString()} ETH`
    // );

    // console.log(
    //     "DEBUG. Borrower balance before collection:",
    //     ((await web3.eth.getBalance(loan.borrower)) / ONE_ETH).toString()
    // );
    const tx = await loanManager.collect([loan.id], { from: loan.collector });
    testHelpers.logGasUse(testInstance, tx, "collect 1");
    // console.log(
    //     "DEBUG. Borrower balance after collection:",
    //     ((await web3.eth.getBalance(loan.borrower)) / ONE_ETH).toString()
    // );

    const [totalSupplyAfter, totalLoanAmountAfter, , ,] = await Promise.all([
        augmintToken.totalSupply(),
        monetarySupervisor.totalLoanAmount(),

        testHelpers.assertEvent(loanManager, "LoanCollected", {
            loanId: loan.id,
            borrower: loan.borrower,
            collectedCollateral: collectedCollateral.toString(),
            releasedCollateral: releasedCollateral.toString(),
            defaultingFee: defaultingFee.toString()
        }),

        loanAsserts(loan),

        tokenTestHelpers.assertBalances(balBefore, {
            reserve: {
                eth: balBefore.reserve.eth.add(collectedCollateral)
            },

            collector: {
                gasFee: COLLECT_BASEFEE
            },

            borrower: {
                eth: balBefore.borrower.eth.add(releasedCollateral)
            },

            loanManager: {
                eth: balBefore.loanManager.eth.minus(loan.collateral)
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

async function getProductInfo(productId) {
    const prod = await loanManager.products(productId);
    const info = {
        id: productId,
        term: prod[0],
        discountRate: prod[1],
        collateralRatio: prod[2],
        minDisbursedAmount: prod[3],
        defaultingFeePt: prod[4],
        isActive: prod[5]
    };
    return info;
}

async function calcLoanValues(rates, product, collateralWei) {
    const ret = {};

    ret.collateral = new BigNumber(collateralWei);

    // LoanManager contract code :
    // calculate loan values based on ETH sent in with Tx
    // uint tokenValue = rates.convertFromWei(augmintToken.peggedSymbol(), msg.value);
    // uint repaymentAmount = tokenValue.mul(products[productId].collateralRatio).roundedDiv(100000000);
    // repaymentAmount = repaymentAmount * 100;  // rounding 4 decimals value to 2 decimals.
    ret.tokenValue = await rates.convertFromWei(peggedSymbol, collateralWei);
    ret.repaymentAmount = ret.tokenValue
        .mul(product.collateralRatio)
        .div(100000000)
        .round(0, BigNumber.ROUND_HALF_UP)
        .mul(100);

    // LoanManager contract code :
    // uint mul = products[productId].collateralRatio.mul(products[productId].discountRate) / 1000000;
    // uint loanAmount = tokenValue.mul(mul).roundedDiv(100000000);
    // loanAmount = loanAmount * 100;
    ret.loanAmount = product.collateralRatio
        .mul(product.discountRate)
        .div(1000000)
        .round(0, BigNumber.ROUND_DOWN)
        .mul(ret.tokenValue)
        .div(100000000)
        .round(0, BigNumber.ROUND_HALF_UP)
        .mul(100);

    ret.interestAmount = ret.repaymentAmount.minus(ret.loanAmount);
    ret.disbursementTime = moment()
        .utc()
        .unix();
    ret.product = product;
    return ret;
}

async function loanAsserts(expLoan) {
    const loan = await loanManager.loans(expLoan.id);
    assert.equal(loan[0], expLoan.borrower, "borrower should be set");
    assert.equal(loan[1].toNumber(), expLoan.state, "loan state should be set");
    assert.equal(loan[2].toString(), expLoan.collateral.toString(), "collateralAmount should be set");
    assert.equal(loan[3].toString(), expLoan.repaymentAmount.toString(), "repaymentAmount should be set");
    assert.equal(loan[4].toString(), expLoan.loanAmount.toString(), "loanAmount should be set");
    assert.equal(loan[5].toString(), expLoan.interestAmount.toString(), "interestAmount should be set");
    assert.equal(loan[6].toString(), expLoan.product.term.toString(), "term should be set");

    const disbursementTimeActual = loan[7];
    assert(
        disbursementTimeActual >= expLoan.disbursementTime,
        "disbursementDate should be at least the time at disbursement"
    );
    assert(
        disbursementTimeActual <= expLoan.disbursementTime + 5,
        "disbursementDate should be at most the time at disbursement + 5. Difference is: " +
            (disbursementTimeActual - expLoan.disbursementTime)
    );

    assert.equal(
        loan[8].toString(),
        disbursementTimeActual.add(expLoan.product.term),
        "maturity should be at disbursementDate + term"
    );

    assert.equal(loan[9].toString(), expLoan.product.defaultingFeePt.toString(), "defaultingFeePt should be set");
}
