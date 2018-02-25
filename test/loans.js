const BigNumber = require("bignumber.js");
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

contract("Loans tests", accounts => {
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

        const [newProducts] = await Promise.all([
            loanTestHelpers.getProductsInfo(prodCount),
            tokenTestHelpers.withdrawFromReserve(accounts[0], 1000000000)
        ]);
        [
            products.notDue,
            products.repaying,
            products.defaulting,
            products.defaultingNoLeftOver,
            products.disabledProduct
        ] = newProducts;
    });

    it("Should get an A-EUR loan", async function() {
        await loanTestHelpers.createLoan(this, products.repaying, accounts[0], web3.toWei(0.5));
    });

    it("Should NOT get a loan less than minDisbursedAmount", async function() {
        const prod = products.repaying;
        const loanAmount = prod.minDisbursedAmount
            .sub(1)
            .div(prod.discountRate)
            .mul(1000000)
            .round(0, BigNumber.ROUND_UP);
        const weiAmount = (await rates.convertToWei(tokenTestHelpers.peggedSymbol, loanAmount))
            .div(prod.collateralRatio)
            .mul(1000000)
            .round(0, BigNumber.ROUND_UP);

        await testHelpers.expectThrow(loanManager.newEthBackedLoan(prod.id, { from: accounts[0], value: weiAmount }));
    });

    it("Shouldn't get a loan for a disabled product", async function() {
        await testHelpers.expectThrow(
            loanManager.newEthBackedLoan(products.disabledProduct.id, { from: accounts[0], value: web3.toWei(0.5) })
        );
    });

    it("Should repay an A-EUR loan before maturity", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.notDue, accounts[1], web3.toWei(0.5));
        // send interest to borrower to have enough A-EUR to repay in test
        await augmintToken.transfer(loan.borrower, loan.interestAmount, {
            from: accounts[0]
        });
        await loanTestHelpers.repayLoan(this, loan, true);
    });

    it("Non owner should be able to repay a loan too", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.notDue, accounts[1], web3.toWei(0.5));

        await augmintToken.transferAndNotify(loanManager.address, loan.repaymentAmount, loan.id, {
            from: accounts[0]
        });

        await testHelpers.assertEvent(loanManager, "LoanRepayed", {
            loanId: loan.id,
            borrower: loan.borrower
        });
    });

    it("Should NOT repay an A-EUR loan on maturity if A-EUR balance is insufficient", async function() {
        const borrower = accounts[2];
        const loan = await loanTestHelpers.createLoan(this, products.notDue, borrower, web3.toWei(0.5));
        const accBal = await augmintToken.balanceOf(borrower);

        // send just 0.01 A€ less than required for repayment
        const topUp = loan.repaymentAmount.sub(accBal).sub(1);
        assert(accBal.add(topUp).lt(loan.repaymentAmount)); // sanitiy against previous tests accidently leaving A€ borrower account
        await augmintToken.transfer(borrower, topUp, {
            from: accounts[0]
        });

        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(loanManager.address, loan.repaymentAmount, loan.id, { from: borrower })
        );
    });

    it("should not repay a loan with smaller amount than repaymentAmount", async function() {
        const borrower = accounts[1];
        const loan = await loanTestHelpers.createLoan(this, products.notDue, borrower, web3.toWei(0.2));

        await augmintToken.transfer(loan.borrower, loan.interestAmount, {
            from: accounts[0]
        });

        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(loanManager.address, loan.repaymentAmount.sub(1), loan.id, {
                from: borrower
            })
        );
    });

    it("Should not repay with invalid loanId", async function() {
        const loanCount = await loanManager.getLoanCount();
        await testHelpers.expectThrow(augmintToken.transferAndNotify(loanManager.address, 10000, loanCount));
    });

    it("Should NOT repay a loan after maturity", async function() {
        const borrower = accounts[0];
        const loan = await loanTestHelpers.createLoan(this, products.defaulting, borrower, web3.toWei(0.5));

        const [accBal] = await Promise.all([
            augmintToken.balanceOf(borrower),
            testHelpers.waitForTimeStamp(loan.maturity + 1)
        ]);
        assert(accBal.gt(loan.repaymentAmount)); // sanitiy to make sure repayment is not failing on insufficient A€

        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(loanManager.address, loan.repaymentAmount, loan.id, {
                from: borrower
            })
        );
    });

    it("Should not get a loan when rates = 0", async function() {
        await rates.setRate("EUR", 0);
        await testHelpers.expectThrow(
            loanManager.newEthBackedLoan(products.repaying.id, {
                from: accounts[1],
                value: web3.toWei(0.1)
            })
        );
        await rates.setRate("EUR", 99800); // restore rates
    });

    it("Should get a loan if interest rate is negative "); // to be implemented

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

    it("Should NOT collect a loan before it's due", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.repaying, accounts[1], web3.toWei(0.5));
        await testHelpers.expectThrow(loanManager.collect([loan.id]));
    });

    it("Should not collect when rate = 0", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(this, products.defaultingNoLeftOver, accounts[1], web3.toWei(2));
        await Promise.all([rates.setRate("EUR", 0), testHelpers.waitForTimeStamp(loan.maturity)]);

        testHelpers.expectThrow(loanTestHelpers.collectLoan(this, loan, accounts[2]));
        await rates.setRate("EUR", 99800);
    });

    it("Should list loans from offset", async function() {
        const product = products.repaying;

        const loan = await loanTestHelpers.createLoan(this, product, accounts[1], web3.toWei(2));

        const loansArray = await loanManager.getLoans(loan.id);
        const loanInfo = loanTestHelpers.parseLoansInfo(loansArray);

        assert.equal(loanInfo.length, 1); // offset was from last loan added

        const lastLoan = loanInfo[0];

        assert.equal(lastLoan.id.toNumber(), loan.id);
        assert.equal(lastLoan.collateralAmount.toNumber(), loan.collateralAmount);
        assert.equal(lastLoan.repaymentAmount.toNumber(), loan.repaymentAmount);
        assert.equal("0x" + lastLoan.borrower.toString(16), loan.borrower);
        assert.equal(lastLoan.productId.toNumber(), product.id);
        assert.equal(lastLoan.state.toNumber(), loan.state);
        assert.equal(lastLoan.maturity.toNumber(), loan.maturity);
        assert.equal(lastLoan.disbursementTime.toNumber(), loan.maturity - product.term);
        assert.equal(lastLoan.loanAmount.toNumber(), loan.loanAmount);
        assert.equal(lastLoan.interestAmount.toNumber(), loan.interestAmount);
    });

    it("Should list loans for one account from offset", async function() {
        const product = products.repaying;
        const borrower = accounts[1];

        const loan = await loanTestHelpers.createLoan(this, product, borrower, web3.toWei(2));
        const accountLoanCount = await loanManager.getLoanCountForAddress(borrower);

        const loansArray = await loanManager.getLoansForAddress(borrower, accountLoanCount - 1);
        const loanInfo = loanTestHelpers.parseLoansInfo(loansArray);
        assert.equal(loanInfo.length, 1); // offset was from last loan added for account

        const lastLoan = loanInfo[0];

        assert.equal(lastLoan.id.toNumber(), loan.id);
        assert.equal(lastLoan.collateralAmount.toNumber(), loan.collateralAmount);
        assert.equal(lastLoan.repaymentAmount.toNumber(), loan.repaymentAmount);
        assert.equal("0x" + lastLoan.borrower.toString(16), loan.borrower);
        assert.equal(lastLoan.productId.toNumber(), product.id);
        assert.equal(lastLoan.state.toNumber(), loan.state);
        assert.equal(lastLoan.maturity.toNumber(), loan.maturity);
        assert.equal(lastLoan.disbursementTime.toNumber(), loan.maturity - product.term);
        assert.equal(lastLoan.loanAmount.toNumber(), loan.loanAmount);
        assert.equal(lastLoan.interestAmount.toNumber(), loan.interestAmount);
    });

    it("Should NOT collect an already collected loan", async function() {
        const loan = await loanTestHelpers.createLoan(this, products.defaulting, accounts[1], web3.toWei(0.5));

        await testHelpers.waitForTimeStamp(loan.maturity);

        await loanTestHelpers.collectLoan(this, loan, accounts[2]);
        await testHelpers.expectThrow(loanManager.collect([loan.id]));
    });

    it("Should collect multiple defaulted A-EUR loans ");

    it("Should get and repay a loan with colletaralRatio = 1");
    it("Should get and repay a loan with colletaralRatio > 1");
    it("Should get and collect a loan with colletaralRatio = 1");
    it("Should get and collect a loan with colletaralRatio > 1");

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
