const LoanManager = artifacts.require("./LoanManager.sol");

const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const loanTestHelpers = require("./helpers/loanTestHelpers.js");
const ratesTestHelpers = require("./helpers/ratesTestHelpers.js");

let augmintToken = null;
let loanManager = null;
let monetarySupervisor = null;
let rates = null;
let products = {};

contract("Augmint Loans tests", accounts => {
    before(async function() {
        rates = ratesTestHelpers.rates;
        monetarySupervisor = tokenTestHelpers.monetarySupervisor;
        augmintToken = tokenTestHelpers.augmintToken;
        loanManager = loanTestHelpers.loanManager;
        await tokenTestHelpers.issueToReserve(1000000000);

        // These neeed to be sequantial b/c ids hardcoded in tests.
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 2 decimals), defaultingFeePt, isActive
        // notDue: (due in 1 day)
        const prodCount = (await loanManager.getProductCount()).toNumber();

        await loanManager.addLoanProduct(86400, 970000, 850000, 3000, 50000, true);
        // repaying: due in 60 sec for testing repayment
        await loanManager.addLoanProduct(60, 985000, 900000, 2000, 50000, true);
        // defaulting: due in 1 sec, repay in 1sec for testing defaults
        //await loanManager.addLoanProduct(1, 990000, 600000, 100000, 50000, true);
        await loanManager.addLoanProduct(1, 970000, 850000, 1000, 50000, true);
        // defaulting no left over collateral: due in 1 sec, repay in 1sec for testing defaults without leftover
        await loanManager.addLoanProduct(1, 900000, 900000, 1000, 100000, true);
        // disabled product
        await loanManager.addLoanProduct(1, 990000, 990000, 1000, 50000, false);

        [
            products.disabledProduct,
            products.defaultingNoLeftOver,
            products.defaulting,
            products.repaying,
            products.notDue,
            ,
        ] = await Promise.all([
            loanTestHelpers.getProductInfo(prodCount + 4),
            loanTestHelpers.getProductInfo(prodCount + 3),
            loanTestHelpers.getProductInfo(prodCount + 2),
            loanTestHelpers.getProductInfo(prodCount + 1),
            loanTestHelpers.getProductInfo(prodCount),
            tokenTestHelpers.withdrawFromReserve(accounts[0], 1000000000)
        ]);
    });

    it("Should get an ACE loan", async function() {
        await loanTestHelpers.createLoan(this, products.repaying, accounts[0], web3.toWei(0.5));
    });

    it("Should NOT get a loan less than minLoanAmount");

    it("Shouldn't get a loan for a disabled product", async function() {
        await testHelpers.expectThrow(
            loanManager.newEthBackedLoan(products.disabledProduct.id, { from: accounts[0], value: web3.toWei(0.5) })
        );
    });

    it("Should NOT collect a loan before it's due");
    it("Should NOT repay an ACE loan on maturity if ACE balance is insufficient");
    it("should not repay a loan with smaller amount than repaymentAmount");
    it("Non owner should be able to repay a loan too");
    it("Should not repay with invalid loanId");

    it("Should repay an ACE loan before maturity", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.notDue, accounts[1], web3.toWei(0.5));
        // send interest to borrower to have enough ACE to repay in test
        await augmintToken.transfer(loan.borrower, loan.interestAmount, {
            from: accounts[0]
        });
        await loanTestHelpers.repayLoan(this, loan, true); // repaymant via AugmintToken.repayLoan convenience func
    });

    it("Should collect a defaulted ACE loan and send back leftover collateral ", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.defaulting, accounts[1], web3.toWei(0.5));

        await testHelpers.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber());

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted ACE loan when no leftover collateral (collection exactly covered)", async function() {
        await rates.setRate("EUR", 100000);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(1));

        await Promise.all([
            rates.setRate("EUR", 99000),
            testHelpers.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted ACE loan when no leftover collateral (collection partially covered)", async function() {
        await rates.setRate("EUR", 100000);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(1));

        await Promise.all([
            rates.setRate("EUR", 98900),
            testHelpers.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted ACE loan when no leftover collateral (only fee covered)", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([
            rates.setRate("EUR", 1),
            testHelpers.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
    });

    it("Should not collect when rate = 0", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([
            rates.setRate("EUR", 0),
            testHelpers.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        testHelpers.expectThrow(loanTestHelpers.collectLoan(this, loan, accounts[2]));
    });

    it("Should get loans from offset"); // contract func to be implemented
    it("Should get loans for one account from offset"); // contract func to be implemented

    it("Should NOT repay a loan after paymentperiod is over");

    it("Should NOT collect an already collected ACE loan");

    it("Should collect multiple defaulted ACE loans ");

    it("Should get and repay a loan with colletaralRatio = 1");
    it("Should get and repay a loan with colletaralRatio > 1");
    it("Should get and collect a loan with colletaralRatio = 1");
    it("Should get and collect a loan with colletaralRatio > 1");
    it("Should not get a loan when rates = 0");

    it("Should get a loan if interest rate is negative "); // to be implemented

    it("should only allow whitelisted loan contract to be used", async function() {
        const interestEarnedAcc = await monetarySupervisor.interestEarnedAccount();
        const craftedLender = await LoanManager.new(
            augmintToken.address,
            monetarySupervisor.address,
            rates.address,
            interestEarnedAcc
        );
        await rates.setRate("EUR", 99800);
        await craftedLender.grantPermission(accounts[0], "MonetaryBoard");
        await craftedLender.addLoanProduct(100000, 1000000, 1000000, 1000, 50000, true);

        // testing Lender not having "LoanManagerContracts" permission on monetarySupervisor:
        await testHelpers.expectThrow(craftedLender.newEthBackedLoan(0, { value: web3.toWei(1) }));

        // grant permission to create new loan
        await monetarySupervisor.grantPermission(craftedLender.address, "LoanManagerContracts");
        await craftedLender.newEthBackedLoan(0, { value: web3.toWei(1) });

        // revoke permission and try to repay
        await monetarySupervisor.revokePermission(craftedLender.address, "LoanManagerContracts"),
        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(craftedLender.address, 99800, 0, {
                from: accounts[0]
            })
        );
    });

    it("should only allow the token contract to call transferNotification", async function() {
        await testHelpers.expectThrow(loanManager.transferNotification(accounts[0], 1000, 0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.issueLoan", async function() {
        await testHelpers.expectThrow(monetarySupervisor.issueLoan(accounts[0], 0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.loanRepaymentNotification", async function() {
        await testHelpers.expectThrow(monetarySupervisor.loanRepaymentNotification(0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.loanCollectionNotification", async function() {
        await testHelpers.expectThrow(monetarySupervisor.loanCollectionNotification(0, { from: accounts[0] }));
    });
});
