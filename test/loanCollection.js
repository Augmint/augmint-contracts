const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const loanTestHelpers = require("./helpers/loanTestHelpers.js");
const ratesTestHelpers = require("./helpers/ratesTestHelpers.js");

let loanManager = null;
let monetarySupervisor = null;
let rates = null;
const ltdParams = { lockDifferenceLimit: 300000, loanDifferenceLimit: 200000, allowedDifferenceAmount: 100000 };
let products = {};

contract("Loans collection tests", accounts => {
    before(async function() {
        rates = ratesTestHelpers.rates;
        monetarySupervisor = tokenTestHelpers.monetarySupervisor;
        loanManager = loanTestHelpers.loanManager;

        const [prodCount] = await Promise.all([
            loanManager.getProductCount().then(res => res.toNumber()),
            monetarySupervisor.setLtdParams(
                ltdParams.lockDifferenceLimit,
                ltdParams.loanDifferenceLimit,
                ltdParams.allowedDifferenceAmount
            )
        ]);
        // These neeed to be sequantial b/c product order assumed when retreving via getProducts
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 2 decimals), defaultingFeePt, isActive
        await loanManager.addLoanProduct(86400, 970000, 850000, 3000, 50000, true); // notDue
        await loanManager.addLoanProduct(1, 970000, 850000, 1000, 50000, true); // defaulting
        await loanManager.addLoanProduct(1, 900000, 900000, 1000, 100000, true); // defaultingNoLeftOver
        await loanManager.addLoanProduct(1, 1000000, 900000, 2000, 50000, true); // zeroInterest
        await loanManager.addLoanProduct(1, 1100000, 900000, 2000, 50000, true); // negativeInterest
        await loanManager.addLoanProduct(1, 990000, 1000000, 2000, 50000, true); // fullCoverage
        await loanManager.addLoanProduct(1, 990000, 1200000, 2000, 50000, true); // moreCoverage

        const [newProducts] = await Promise.all([
            loanTestHelpers.getProductsInfo(prodCount, 10),
            tokenTestHelpers.issueToken(accounts[0], accounts[0], 1000000000)
        ]);
        [
            products.notDue,
            products.defaulting,
            products.defaultingNoLeftOver,
            products.zeroInterest,
            products.negativeInterest,
            products.fullCoverage,
            products.moreCoverage
        ] = newProducts;
    });

    it("Should collect a defaulted A-EUR loan and send back leftover collateral ", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaulting,
            accounts[1],
            global.web3v1.utils.toWei("0.5")
        );

        await testHelpers.waitForTimeStamp(loan.maturity);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted A-EUR loan when no leftover collateral (collection exactly covered)", async function() {
        await rates.setRate("EUR", 100000);
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaultingNoLeftOver,
            accounts[1],
            global.web3v1.utils.toWei("0.2")
        );

        await Promise.all([rates.setRate("EUR", 99000), testHelpers.waitForTimeStamp(loan.maturity)]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted A-EUR loan when no leftover collateral (collection partially covered)", async function() {
        await rates.setRate("EUR", 100000);
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaultingNoLeftOver,
            accounts[1],
            global.web3v1.utils.toWei("0.2")
        );

        await Promise.all([rates.setRate("EUR", 98900), testHelpers.waitForTimeStamp(loan.maturity)]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted A-EUR loan when no leftover collateral (only fee covered)", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaultingNoLeftOver,
            accounts[1],
            global.web3v1.utils.toWei("0.2")
        );
        await Promise.all([rates.setRate("EUR", 1), testHelpers.waitForTimeStamp(loan.maturity)]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
        await rates.setRate("EUR", 99800); // restore rates
    });

    it("Should get and collect a loan with discountRate = 1 (zero interest)", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.zeroInterest,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await testHelpers.waitForTimeStamp(loan.maturity);
        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should get and collect a loan with discountRate > 1 (negative interest)", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.negativeInterest,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await testHelpers.waitForTimeStamp(loan.maturity);
        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should get and collect a loan with collateralRatio = 1", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.fullCoverage,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await testHelpers.waitForTimeStamp(loan.maturity);
        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should get and collect a loan with collateralRatio > 1", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.moreCoverage,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await testHelpers.waitForTimeStamp(loan.maturity);
        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect multiple defaulted loans", async function() {
        const loanCount = (await loanManager.getLoanCount()).toNumber();
        await Promise.all([
            loanManager.newEthBackedLoan(products.zeroInterest.id, {
                from: accounts[0],
                value: global.web3v1.utils.toWei("0.05")
            }),
            loanManager.newEthBackedLoan(products.fullCoverage.id, {
                from: accounts[1],
                value: global.web3v1.utils.toWei("0.05")
            }),
            loanManager.newEthBackedLoan(products.negativeInterest.id, {
                from: accounts[1],
                value: global.web3v1.utils.toWei("0.05")
            })
        ]);

        await testHelpers.waitFor(1000);

        const tx = await loanManager.collect([loanCount, loanCount + 1, loanCount + 2]);
        testHelpers.logGasUse(this, tx, "collect 3");
    });

    it("Should NOT collect multiple loans if one is not due", async function() {
        const loanCount = (await loanManager.getLoanCount()).toNumber();
        await Promise.all([
            loanManager.newEthBackedLoan(products.notDue.id, {
                from: accounts[0],
                value: global.web3v1.utils.toWei("0.05")
            }),
            loanManager.newEthBackedLoan(products.defaulting.id, {
                from: accounts[1],
                value: global.web3v1.utils.toWei("0.05")
            })
        ]);

        await testHelpers.waitFor(1000);

        await testHelpers.expectThrow(loanManager.collect([loanCount, loanCount + 1]));
    });

    it("Should NOT collect a loan before it's due", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.notDue,
            accounts[1],
            global.web3v1.utils.toWei("0.05")
        );
        await testHelpers.expectThrow(loanManager.collect([loan.id]));
    });

    it("Should not collect when rate = 0", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaultingNoLeftOver,
            accounts[1],
            global.web3v1.utils.toWei("0.05")
        );
        await Promise.all([rates.setRate("EUR", 0), testHelpers.waitForTimeStamp(loan.maturity)]);

        testHelpers.expectThrow(loanTestHelpers.collectLoan(this, loan, accounts[2]));
        await rates.setRate("EUR", 99800);
    });

    it("Should NOT collect an already collected loan", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaulting,
            accounts[1],
            global.web3v1.utils.toWei("0.05")
        );

        await testHelpers.waitForTimeStamp(loan.maturity);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
        await testHelpers.expectThrow(loanManager.collect([loan.id]));
    });

    it("only allowed contract should call MonetarySupervisor.loanCollectionNotification", async function() {
        await testHelpers.expectThrow(monetarySupervisor.loanCollectionNotification(0, { from: accounts[0] }));
    });
});
