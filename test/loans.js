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

const ltdParams = { lockDifferenceLimit: 300000, loanDifferenceLimit: 200000, allowedDifferenceAmount: 1000000 };

let products = {};
let CHUNK_SIZE = 10;

let snapshotIdSingleTest;
let snapshotIdAllTests;

contract("Loans tests", accounts => {
    before(async function() {
        snapshotIdAllTests = await testHelpers.takeSnapshot();

        rates = ratesTestHelpers.rates;
        monetarySupervisor = tokenTestHelpers.monetarySupervisor;
        augmintToken = tokenTestHelpers.augmintToken;
        loanManager = loanTestHelpers.loanManager;

        const [prodCount] = await Promise.all([
            loanManager.getProductCount().then(res => res.toNumber()),
            monetarySupervisor.setLtdParams(
                ltdParams.lockDifferenceLimit,
                ltdParams.loanDifferenceLimit,
                ltdParams.allowedDifferenceAmount
            )
        ]);
        // These neeed to be sequential b/c product order assumed when retrieving via getProducts
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 2 decimals), defaultingFeePt, isActive, minCollateralRatio
        await loanManager.addLoanProduct(86400, 970000, 850000, 3000, 50000, true, 0); // notDue
        await loanManager.addLoanProduct(60, 985000, 900000, 2000, 50000, true, 0); // repaying
        await loanManager.addLoanProduct(1, 970000, 850000, 1000, 50000, true, 0); // defaulting
        await loanManager.addLoanProduct(1, 990000, 990000, 1000, 50000, false, 0); // disabledProduct
        await loanManager.addLoanProduct(60, 1000000, 900000, 2000, 50000, true, 0); // zeroInterest
        await loanManager.addLoanProduct(60, 1100000, 900000, 2000, 50000, true, 0); // negativeInterest
        await loanManager.addLoanProduct(60, 990000, 1000000, 2000, 50000, true, 0); // fullCoverage
        await loanManager.addLoanProduct(60, 990000, 1200000, 2000, 50000, true, 0); // moreCoverage
        await loanManager.addLoanProduct(86400, 970000, 625000, 3000, 50000, true, 1200000); // with margin (collateral ratio: initial = 160%, minimum = 120%) (1/1.6 = 0.625)

        const [newProducts] = await Promise.all([
            loanTestHelpers.getProductsInfo(prodCount, CHUNK_SIZE),
            tokenTestHelpers.issueToken(accounts[0], accounts[0], 1000000000)
        ]);
        [
            products.notDue,
            products.repaying,
            products.defaulting,
            products.disabledProduct,
            products.zeroInterest,
            products.negativeInterest,
            products.fullCoverage,
            products.moreCoverage,
            products.margin
        ] = newProducts;
    });

    after(async () => {
        await testHelpers.revertSnapshot(snapshotIdAllTests);
    });

    beforeEach(async function() {
        snapshotIdSingleTest = await testHelpers.takeSnapshot();
    });

    afterEach(async function() {
        await testHelpers.revertSnapshot(snapshotIdSingleTest);
    });

    it("Should get an A-EUR loan", async function() {
        await loanTestHelpers.createLoan(this, products.repaying, accounts[0], global.web3v1.utils.toWei("0.5"));
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
            loanManager.newEthBackedLoan(products.disabledProduct.id, {
                from: accounts[0],
                value: global.web3v1.utils.toWei("0.05")
            })
        );
    });

    it("Should repay an A-EUR loan before maturity", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.notDue,
            accounts[1],
            global.web3v1.utils.toWei("0.05")
        );
        // send interest to borrower to have enough A-EUR to repay in test
        await augmintToken.transfer(loan.borrower, loan.interestAmount, {
            from: accounts[0]
        });
        await loanTestHelpers.repayLoan(this, loan);
    });

    it("Should get and repay a loan whith discountRate = 1 (zero interest)", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.zeroInterest,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await loanTestHelpers.repayLoan(this, loan);
    });

    it("Should get and repay a loan whith discountRate > 1 (negative interest)", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.negativeInterest,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await loanTestHelpers.repayLoan(this, loan);
    });

    it("Should get and repay a loan with colletaralRatio = 1", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.fullCoverage,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await loanTestHelpers.repayLoan(this, loan);
    });

    it("Should get and repay a loan with colletaralRatio > 1", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.moreCoverage,
            accounts[0],
            global.web3v1.utils.toWei("0.05")
        );
        await loanTestHelpers.repayLoan(this, loan);
    });

    it("Non owner should be able to repay a loan too", async function() {
        const loan = await loanTestHelpers.createLoan(
            this,
            products.notDue,
            accounts[1],
            global.web3v1.utils.toWei("0.05")
        );

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
        const loan = await loanTestHelpers.createLoan(
            this,
            products.notDue,
            borrower,
            global.web3v1.utils.toWei("0.05")
        );
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
        const loan = await loanTestHelpers.createLoan(
            this,
            products.notDue,
            borrower,
            global.web3v1.utils.toWei("0.05")
        );

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
        const loan = await loanTestHelpers.createLoan(
            this,
            products.defaulting,
            borrower,
            global.web3v1.utils.toWei("0.05")
        );

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
                value: global.web3v1.utils.toWei("0.1")
            })
        );
        await rates.setRate("EUR", 99800); // restore rates
    });

    it("Should list loans from offset", async function() {
        const product = products.repaying;
        const product2 = products.defaulting;

        const loan1 = await loanTestHelpers.createLoan(this, product, accounts[1], global.web3v1.utils.toWei("0.05"));
        const loan2 = await loanTestHelpers.createLoan(this, product2, accounts[2], global.web3v1.utils.toWei("0.06"));

        await testHelpers.waitForTimeStamp(loan2.maturity);

        const loansArray = await loanManager.getLoans(loan1.id, CHUNK_SIZE);
        assert.equal(loansArray.length, 2);

        const loanInfo = loanTestHelpers.parseLoansInfo(loansArray);
        assert.equal(loanInfo.length, 2); // offset was from first loan added

        const loan1Actual = loanInfo[0];

        assert.equal(loan1Actual.id.toNumber(), loan1.id);
        assert.equal(loan1Actual.collateralAmount.toNumber(), loan1.collateralAmount);
        assert.equal(loan1Actual.repaymentAmount.toNumber(), loan1.repaymentAmount);
        assert.equal(
            "0x" + loan1Actual.borrower.toString(16).padStart(40, "0"), // leading 0s if address starts with 0
            loan1.borrower
        );
        assert.equal(loan1Actual.productId.toNumber(), product.id);
        assert.equal(loan1Actual.state.toNumber(), loan1.state);
        assert.equal(loan1Actual.isCollectable.toNumber(), 0);
        assert.equal(loan1Actual.maturity.toNumber(), loan1.maturity);
        assert.equal(loan1Actual.disbursementTime.toNumber(), loan1.maturity - product.term);
        assert.equal(loan1Actual.loanAmount.toNumber(), loan1.loanAmount);
        assert.equal(loan1Actual.interestAmount.toNumber(), loan1.interestAmount);

        const loan2Actual = loanInfo[1];

        assert.equal(loan2Actual.id.toNumber(), loan2.id);
        assert.equal(
            "0x" + loan2Actual.borrower.toString(16).padStart(40, "0"), // leading 0s if address starts with 0
            loan2.borrower
        );
        assert.equal(loan2Actual.state.toNumber(), 0); // Open (defaulted but not yet collected)
        assert.equal(loan2Actual.isCollectable.toNumber(), 1);
    });

    it("Should list loans for one account from offset", async function() {
        const product1 = products.repaying;
        const product2 = products.defaulting;
        const borrower = accounts[1];

        const loan1 = await loanTestHelpers.createLoan(this, product1, borrower, global.web3v1.utils.toWei("0.05"));
        const loan2 = await loanTestHelpers.createLoan(this, product2, borrower, global.web3v1.utils.toWei("0.06"));
        const accountLoanCount = await loanManager.getLoanCountForAddress(borrower);

        await testHelpers.waitForTimeStamp(loan2.maturity);

        const loansArray = await loanManager.getLoansForAddress(borrower, accountLoanCount - 2, CHUNK_SIZE);
        assert.equal(loansArray.length, 2);

        const loanInfo = loanTestHelpers.parseLoansInfo(loansArray);
        assert.equal(loanInfo.length, 2); // offset was from first loan added for account

        const loan1Actual = loanInfo[0];

        assert.equal(loan1Actual.id.toNumber(), loan1.id);
        assert.equal(loan1Actual.collateralAmount.toNumber(), loan1.collateralAmount);
        assert.equal(loan1Actual.repaymentAmount.toNumber(), loan1.repaymentAmount);
        assert.equal(
            "0x" + loan1Actual.borrower.toString(16).padStart(40, "0"), // leading 0s if address starts with 0
            loan1.borrower
        );
        assert.equal(loan1Actual.productId.toNumber(), product1.id);
        assert.equal(loan1Actual.state.toNumber(), loan1.state);
        assert.equal(loan1Actual.isCollectable.toNumber(), 0);
        assert.equal(loan1Actual.maturity.toNumber(), loan1.maturity);
        assert.equal(loan1Actual.disbursementTime.toNumber(), loan1.maturity - product1.term);
        assert.equal(loan1Actual.loanAmount.toNumber(), loan1.loanAmount);
        assert.equal(loan1Actual.interestAmount.toNumber(), loan1.interestAmount);

        const loan2Actual = loanInfo[1];
        assert.equal(loan2Actual.id.toNumber(), loan2.id);
        assert.equal(loan2Actual.state.toNumber(), 0); // Open (defaulted but not yet collected)
        assert.equal(loan2Actual.isCollectable.toNumber(), 1);
    });

    it("should only allow whitelisted loan contract to be used", async function() {
        const craftedLender = await LoanManager.new(
            accounts[0],
            augmintToken.address,
            monetarySupervisor.address,
            rates.address
        );
        await Promise.all([
            await rates.setRate("EUR", 99800),
            await craftedLender.grantPermission(accounts[0], "StabilityBoard")
        ]);
        await craftedLender.addLoanProduct(100000, 1000000, 1000000, 1000, 50000, true, 0);

        // testing Lender not having "LoanManager" permission on monetarySupervisor:
        await testHelpers.expectThrow(craftedLender.newEthBackedLoan(0, { value: global.web3v1.utils.toWei("0.05") }));

        // grant permission to create new loan
        await monetarySupervisor.grantPermission(craftedLender.address, "LoanManager");
        await craftedLender.newEthBackedLoan(0, { value: global.web3v1.utils.toWei("0.05") });

        // revoke permission and try to repay
        await monetarySupervisor.revokePermission(craftedLender.address, "LoanManager"),
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

    // Margin tests:
    // ==============
    // initial rate = 99800 (token/eth)
    // collateral = 0.05 (eth)
    // collateral ratio: initial = 160%, minimum = 120% (1/1.6 = 0.625)
    //
    // 100% => 3118.75 (token)  => @ 62375 (token/eth)
    // 120% => 3742.5 (token)   => @ 74850 (token/eth)  => marginCallRate: 74832 (due to internal rounding in contract)
    // 160% => 4990 (token)     => @ 99800 (token/eth)

    it("tests loan margin numbers", async function() {
        await rates.setRate("EUR", 99800);
        const loan = await loanTestHelpers.createLoan(
            this,
            products.margin,
            accounts[1],
            global.web3v1.utils.toWei("0.05")
        );

        // assert event has proper numbers
        assert(loan.collateralAmount.toNumber() === 5e16);
        assert(loan.tokenValue.toNumber() === 4990);
        assert(loan.repaymentAmount.toNumber() === 3118);
        assert(loan.loanAmount.toNumber() === 3024);
        assert(loan.interestAmount.toNumber() === 94);
        assert(loan.state === 0);

        // assert LoanData has proper numbers stored
        const loanInfo = loanTestHelpers.parseLoansInfo(await loanManager.getLoans(loan.id, 1));
        assert(loanInfo[0].collateralAmount.toNumber() === 5e16);
        assert(loanInfo[0].repaymentAmount.toNumber() === 3118);
        assert(loanInfo[0].state.toNumber() === 0);
        assert(loanInfo[0].loanAmount.toNumber() === 3024);
        assert(loanInfo[0].interestAmount.toNumber() === 94);
        assert(loanInfo[0].marginCallRate.toNumber() === 74832);
        assert(loanInfo[0].isCollectable.toNumber() === 0);

        // every number stays the same below margin, only isCollectable will be true
        await rates.setRate("EUR", 72000);
        const loanInfo2 = loanTestHelpers.parseLoansInfo(await loanManager.getLoans(loan.id, 1));
        assert(loanInfo2[0].collateralAmount.toNumber() === 5e16);
        assert(loanInfo2[0].repaymentAmount.toNumber() === 3118);
        assert(loanInfo2[0].state.toNumber() === 0);
        assert(loanInfo2[0].loanAmount.toNumber() === 3024);
        assert(loanInfo2[0].interestAmount.toNumber() === 94);
        assert(loanInfo2[0].marginCallRate.toNumber() === 74832);
        assert(loanInfo2[0].isCollectable.toNumber() === 1);

        // add extra collateral to get above margin
        const tx = await loanManager.addExtraCollateral(loan.id, {
            from: accounts[1],
            value: global.web3v1.utils.toWei("0.05")
        });
        testHelpers.logGasUse(this, tx, "addExtraCollateral");

        // collateralAmount should double up, marginCallRate get halved
        const loanInfo3 = loanTestHelpers.parseLoansInfo(await loanManager.getLoans(loan.id, 1));
        assert(loanInfo3[0].collateralAmount.toNumber() === 2 * 5e16);
        assert(loanInfo3[0].repaymentAmount.toNumber() === 3118);
        assert(loanInfo3[0].state.toNumber() === 0);
        assert(loanInfo3[0].loanAmount.toNumber() === 3024);
        assert(loanInfo3[0].interestAmount.toNumber() === 94);
        assert(loanInfo3[0].marginCallRate.toNumber() === 74832 / 2);
        assert(loanInfo3[0].isCollectable.toNumber() === 0);
    });
});
