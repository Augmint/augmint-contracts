const loanTestHelper = require("./helpers/loanTestHelper.js");
const LoanManager = artifacts.require("./LoanManager.sol");
const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const monetarySupervisorTestHelpers = require("./helpers/monetarySupervisorTestHelpers.js");
const ratesTestHelper = require("./helpers/ratesTestHelper.js");
const testHelper = require("./helpers/testHelper.js");

let tokenAce, loanManager, monetarySupervisor, rates;
let products = {};

contract("ACE Loans tests", accounts => {
    before(async function() {
        [tokenAce, rates] = await Promise.all([
            tokenAceTestHelper.newTokenAceMock(),
            ratesTestHelper.newRatesMock("EUR", 9980000)
        ]);
        monetarySupervisor = await monetarySupervisorTestHelpers.newMonetarySupervisorMock(tokenAce);

        [loanManager] = await Promise.all([
            loanTestHelper.newLoanManagerMock(tokenAce, monetarySupervisor, rates),
            monetarySupervisor.issue(1000000000)
        ]);

        [
            products.disabledProduct,
            products.defaultingNoLeftOver,
            products.defaulting,
            products.repaying,
            products.notDue,
            ,
        ] = await Promise.all([
            loanTestHelper.getProductInfo(4),
            loanTestHelper.getProductInfo(3),
            loanTestHelper.getProductInfo(2),
            loanTestHelper.getProductInfo(1),
            loanTestHelper.getProductInfo(0),
            tokenAce.withdrawTokens(accounts[0], 1000000000)
        ]);

        // For test debug:
        // for (const key of Object.keys(products)) {
        //     console.log({
        //         product: key,
        //         id: products[key].id,
        //         term: products[key].term.toString(),
        //         repayPeriod: products[key].repayPeriod.toString()
        //     });
        // }
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
        await tokenAce.transfer(loan.borrower, loan.interestAmount, {
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
            tokenAce.address,
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
            tokenAce.transferAndNotify(craftedLender.address, 9980000, 0, {
                from: accounts[0]
            })
        );
    });

    it("should only allow the token contract to call transferNotification", async function() {
        await testHelper.expectThrow(loanManager.transferNotification(accounts[0], 1000, 0, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.issueLoan", async function() {
        await testHelper.expectThrow(monetarySupervisor.issueLoan(accounts[0], 1000, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.burnLoan", async function() {
        await testHelper.expectThrow(monetarySupervisor.burnLoan(1000, { from: accounts[0] }));
    });

    it("only allowed contract should call MonetarySupervisor.loanCollectionNotification", async function() {
        await testHelper.expectThrow(monetarySupervisor.loanCollectionNotification(1000, { from: accounts[0] }));
    });
});
