const LoanManager = artifacts.require("./LoanManager.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Rates = artifacts.require("./Rates.sol");

const testHelper = require("./helpers/testHelper.js");
const augmintTokenTestHelper = require("./helpers/tokenTestHelpers.js");
const loanTestHelper = require("./helpers/loanTestHelper.js");

let augmintToken = null;
let loanManager = null;
let monetarySupervisor = null;
let rates = null;
let products = {};

contract("Augmint Loans tests", accounts => {
    before(async function() {
        rates = Rates.at(Rates.address);
        monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        augmintToken = await augmintTokenTestHelper.getAugmintToken();

        [loanManager] = await Promise.all([
            loanTestHelper.getLoanManager(),
            augmintTokenTestHelper.issueToReserve(1000000000)
        ]);

        // These neeed to be sequantial b/c ids hardcoded in tests.
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        // notDue: (due in 1 day)
        const prodCount = (await loanManager.getProductCount()).toNumber();

        await loanManager.addLoanProduct(86400, 970000, 850000, 300000, 50000, true);
        // repaying: due in 60 sec for testing repayment
        await loanManager.addLoanProduct(60, 985000, 900000, 200000, 50000, true);
        // defaulting: due in 1 sec, repay in 1sec for testing defaults
        await loanManager.addLoanProduct(1, 990000, 600000, 100000, 50000, true);
        // defaulting no left over collateral: due in 1 sec, repay in 1sec for testing defaults without leftover
        await loanManager.addLoanProduct(1, 900000, 900000, 100000, 100000, true);
        // disabled product
        await loanManager.addLoanProduct(1, 990000, 990000, 100000, 50000, false);

        [
            products.disabledProduct,
            products.defaultingNoLeftOver,
            products.defaulting,
            products.repaying,
            products.notDue,
            ,
        ] = await Promise.all([
            loanTestHelper.getProductInfo(prodCount + 4),
            loanTestHelper.getProductInfo(prodCount + 3),
            loanTestHelper.getProductInfo(prodCount + 2),
            loanTestHelper.getProductInfo(prodCount + 1),
            loanTestHelper.getProductInfo(prodCount),
            augmintTokenTestHelper.withdrawFromReserve(accounts[0], 1000000000)
        ]);
    });

    it("Should get an ACE loan", async function() {
        await loanTestHelper.createLoan(this, products.repaying, accounts[0], web3.toWei(0.5));
    });

    it("Should NOT get a loan less than minLoanAmount");

    it("Shouldn't get a loan for a disabled product", async function() {
        await testHelper.expectThrow(
            loanManager.newEthBackedLoan(products.disabledProduct.id, { from: accounts[0], value: web3.toWei(0.5) })
        );
    });

    it("Should NOT collect a loan before it's due");
    it("Should NOT repay an ACE loan on maturity if ACE balance is insufficient");
    it("should not repay a loan with smaller amount than repaymentAmount");
    it("Non owner should be able to repay a loan too");
    it("Should not repay with invalid loanId");

    it("Should repay an ACE loan before maturity", async function() {
        const loan = await loanTestHelper.createLoan(this, products.notDue, accounts[1], web3.toWei(0.5));
        // send interest to borrower to have enough ACE to repay in test
        await augmintToken.transfer(loan.borrower, loan.interestAmount, {
            from: accounts[0]
        });
        await loanTestHelper.repayLoan(this, loan, true); // repaymant via AugmintToken.repayLoan convenience func
    });

    it("Should collect a defaulted ACE loan and send back leftover collateral ", async function() {
        const loan = await loanTestHelper.createLoan(this, products.defaulting, accounts[1], web3.toWei(0.5));

        await testHelper.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber());

        await loanTestHelper.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted ACE loan when no leftover collateral (collection exactly covered)", async function() {
        await rates.setRate("EUR", 10000000);
        const loan = await loanTestHelper.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(1));

        await Promise.all([
            rates.setRate("EUR", 9900000),
            testHelper.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        await loanTestHelper.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted ACE loan when no leftover collateral (collection partially covered)", async function() {
        await rates.setRate("EUR", 10000000);
        const loan = await loanTestHelper.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(1));

        await Promise.all([
            rates.setRate("EUR", 9890000),
            testHelper.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        await loanTestHelper.collectLoan(this, loan, accounts[2]);
    });

    it("Should collect a defaulted ACE loan when no leftover collateral (only fee covered)", async function() {
        await rates.setRate("EUR", 9980000);
        const loan = await loanTestHelper.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([
            rates.setRate("EUR", 1),
            testHelper.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        await loanTestHelper.collectLoan(this, loan, accounts[2]);
    });

    it("Should not collect when rate = 0", async function() {
        await rates.setRate("EUR", 9980000);
        const loan = await loanTestHelper.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([
            rates.setRate("EUR", 0),
            testHelper.waitForTimeStamp((await loanManager.loans(loan.id))[8].toNumber())
        ]);

        testHelper.expectThrow(loanTestHelper.collectLoan(this, loan, accounts[2]));
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
        await rates.setRate("EUR", 9980000);
        await craftedLender.grantPermission(accounts[0], "MonetaryBoard");
        await craftedLender.addLoanProduct(100000, 1000000, 1000000, 100000, 50000, true);

        // testing Lender not having "LoanManagerContracts" permission on monetarySupervisor:
        await testHelper.expectThrow(craftedLender.newEthBackedLoan(0, { value: web3.toWei(1) }));

        // grant permission to create new loan
        await monetarySupervisor.grantPermission(craftedLender.address, "LoanManagerContracts");
        await craftedLender.newEthBackedLoan(0, { value: web3.toWei(1) });

        // revoke permission and try to repay
        await monetarySupervisor.revokePermission(craftedLender.address, "LoanManagerContracts"),
        await testHelper.expectThrow(
            augmintToken.transferAndNotify(craftedLender.address, 9980000, 0, {
                from: accounts[0]
            })
        );
    });

    it("should only allow the token contract to call transferNotification", async function() {
        await testHelper.expectThrow(loanManager.transferNotification(accounts[0], 1000, 0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.issueLoan", async function() {
        await testHelper.expectThrow(monetarySupervisor.issueLoan(accounts[0], 0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.loanRepaymentNotification", async function() {
        await testHelper.expectThrow(monetarySupervisor.loanRepaymentNotification(0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.loanCollectionNotification", async function() {
        await testHelper.expectThrow(monetarySupervisor.loanCollectionNotification(0, { from: accounts[0] }));
    });
});
