const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const loanTestHelpers = require("./helpers/loanTestHelpers.js");
const ratesTestHelpers = require("./helpers/ratesTestHelpers.js");

let loanManager = null;
let monetarySupervisor = null;
let rates = null;
let products = {};

contract("Loans tests", accounts => {
    before(async function() {
        rates = ratesTestHelpers.rates;
        monetarySupervisor = tokenTestHelpers.monetarySupervisor;
        loanManager = loanTestHelpers.loanManager;
        await tokenTestHelpers.issueToReserve(1000000000);

        const prodCount = (await loanManager.getProductCount()).toNumber();
        // These neeed to be sequantial b/c product order assumed when retreving via getProducts
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 2 decimals), defaultingFeePt, isActive
        await loanManager.addLoanProduct(86400, 970000, 850000, 3000, 50000, true); // notDue
        await loanManager.addLoanProduct(1, 970000, 850000, 1000, 50000, true); // defaulting
        await loanManager.addLoanProduct(1, 900000, 900000, 1000, 100000, true); // defaultingNoLeftOver
        await loanManager.addLoanProduct(1, 1000000, 900000, 2000, 50000, true); // zeroInterest
        await loanManager.addLoanProduct(1, 1100000, 900000, 2000, 50000, true); // negativeInterest

        const [newProducts] = await Promise.all([
            loanTestHelpers.getProductsInfo(prodCount),
            tokenTestHelpers.withdrawFromReserve(accounts[0], 1000000000)
        ]);
        [
            products.notDue,
            products.defaulting,
            products.defaultingNoLeftOver,
            products.zeroInterest,
            products.negativeInterest
        ] = newProducts;
    });

    it("Should collect a defaulted A-EUR loan and send back leftover collateral ", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.defaulting, accounts[1], web3.toWei(0.5));

        await testHelpers.waitForTimeStamp(loan.maturity);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted A-EUR loan when no leftover collateral (collection exactly covered)", async function() {
        await rates.setRate("EUR", 100000);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(1));

        await Promise.all([rates.setRate("EUR", 99000), testHelpers.waitForTimeStamp(loan.maturity)]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted A-EUR loan when no leftover collateral (collection partially covered)", async function() {
        await rates.setRate("EUR", 100000);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(1));

        await Promise.all([rates.setRate("EUR", 98900), testHelpers.waitForTimeStamp(loan.maturity)]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted A-EUR loan when no leftover collateral (only fee covered)", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([rates.setRate("EUR", 1), testHelpers.waitForTimeStamp(loan.maturity)]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
        await rates.setRate("EUR", 99800); // restore rates
    });

    it("Should get and collect a loan with colletaralRatio = 1", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.zeroInterest, accounts[0], web3.toWei(0.5));
        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should get and collect a loan with colletaralRatio > 1", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.negativeInterest, accounts[0], web3.toWei(0.5));
        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect multiple defaulted A-EUR loans ");

    it("Should NOT collect a loan before it's due", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.notDue, accounts[1], web3.toWei(0.5));
        await testHelpers.expectThrow(loanManager.collect([loan.id]));
    });

    it("Should not collect when rate = 0", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([rates.setRate("EUR", 0), testHelpers.waitForTimeStamp(loan.maturity)]);

        testHelpers.expectThrow(loanTestHelpers.collectLoan(this, loan, accounts[2]));
        await rates.setRate("EUR", 99800);
    });

    it("Should NOT collect an already collected loan", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.defaulting, accounts[1], web3.toWei(0.5));

        await testHelpers.waitForTimeStamp(loan.maturity);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
        await testHelpers.expectThrow(loanManager.collect([loan.id]));
    });

    it("only allowed contract should call MonetarySupervisor.loanCollectionNotification", async function() {
        await testHelpers.expectThrow(monetarySupervisor.loanCollectionNotification(0, { from: accounts[0] }));
    });
});
