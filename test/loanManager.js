const testHelpers = require("./helpers/testHelpers.js");
const loanTestHelpers = require("./helpers/loanTestHelpers.js");

let loanManager = null;

contract("loanManager  tests", accounts => {
    before(async function() {
        loanManager = loanTestHelpers.loanManager;
    });

    it("Should add new product allow listing from offset 0", async function() {
        const prod = {
            // assuming prod attributes are same order as array returned
            minDisbursedAmount: 300000,
            term: 86400,
            discountRate: 970000,
            collateralRatio: 850000,
            defaultingFeePt: 50000,
            isActive: true
        };
        const tx = await loanManager.addLoanProduct(
            prod.term,
            prod.discountRate,
            prod.collateralRatio,
            prod.minDisbursedAmount,
            prod.defaultingFeePt,
            prod.isActive,
            { from: accounts[0] }
        );
        testHelpers.logGasUse(this, tx, "addLoanProduct");

        const res = await testHelpers.assertEvent(loanManager, "LoanProductAdded", {
            productId: x => x
        });
        const prodActual = await loanManager.products(res.productId);

        Object.keys(prod).forEach((argName, index) =>
            assert.equal(
                prodActual[index].toString(),
                prod[argName].toString(),
                `Prod arg ${argName} expected ${prod[argName]} but has value ${prodActual[index]}`
            )
        );

        prod.id = res.productId;
        const productsInfo = await loanTestHelpers.getProductsInfo(0);
        const productCount = (await loanManager.getProductCount()).toNumber();
        assert.equal(productsInfo.length, productCount);
        const lastProduct = productsInfo[productCount - 1];
        assert.equal(lastProduct.id.toNumber(), prod.id);
        assert.equal(lastProduct.term.toNumber(), prod.term);
        assert.equal(lastProduct.discountRate.toNumber(), prod.discountRate);
        assert.equal(lastProduct.collateralRatio.toNumber(), prod.collateralRatio);
        assert.equal(lastProduct.minDisbursedAmount.toNumber(), prod.minDisbursedAmount);
        assert.equal(lastProduct.defaultingFeePt.toNumber(), prod.defaultingFeePt);
        assert.equal(lastProduct.isActive.toNumber(), prod.isActive ? 1 : 0);
    });

    it("Should allow listing products (offset > 0)", async function() {
        const prod = {
            // assuming prod attributes are same order as array returned
            minDisbursedAmount: 300000,
            term: 86400,
            discountRate: 970000,
            collateralRatio: 850000,
            defaultingFeePt: 50000,
            isActive: true
        };
        const tx = await loanManager.addLoanProduct(
            prod.term,
            prod.discountRate,
            prod.collateralRatio,
            prod.minDisbursedAmount,
            prod.defaultingFeePt,
            prod.isActive,
            { from: accounts[0] }
        );
        testHelpers.logGasUse(this, tx, "addLoanProduct");

        const productCount = (await loanManager.getProductCount()).toNumber();
        prod.id = productCount - 1;

        const productsInfo = await loanTestHelpers.getProductsInfo(productCount - 1);
        assert.equal(productsInfo.length, 1);

        const lastProduct = productsInfo[0];
        assert.equal(lastProduct.id.toNumber(), prod.id);
        assert.equal(lastProduct.term.toNumber(), prod.term);
        assert.equal(lastProduct.discountRate.toNumber(), prod.discountRate);
        assert.equal(lastProduct.collateralRatio.toNumber(), prod.collateralRatio);
        assert.equal(lastProduct.minDisbursedAmount.toNumber(), prod.minDisbursedAmount);
        assert.equal(lastProduct.defaultingFeePt.toNumber(), prod.defaultingFeePt);
        assert.equal(lastProduct.isActive.toNumber(), prod.isActive ? 1 : 0);
    });

    it("Only allowed should add new product", async function() {
        await testHelpers.expectThrow(
            loanManager.addLoanProduct(86400, 970000, 850000, 300000, 50000, true, { from: accounts[1] })
        );
    });

    it("Should disable loan product", async function() {
        const tx = await loanManager.setLoanProductActiveState(0, false);
        testHelpers.logGasUse(this, tx, "setLoanProductActiveState");
        assert.equal(
            tx.logs[0].event,
            "LoanProductActiveStateChanged",
            "LoanProductActiveStateChanged event should be emmitted"
        );
        assert(!tx.logs[0].args.newState, "new state should be false");
    });

    it("Should enable loan product", async function() {
        const tx = await loanManager.setLoanProductActiveState(4, true);
        testHelpers.logGasUse(this, tx, "setLoanProductActiveState");
        assert.equal(
            tx.logs[0].event,
            "LoanProductActiveStateChanged",
            "LoanProductActiveStateChanged event should be emmitted"
        );
        assert(tx.logs[0].args.newState, "new state should be true");
    });

    it("Only allowed should set loan product state", async function() {
        await testHelpers.expectThrow(loanManager.setLoanProductActiveState(0, true, { from: accounts[1] }));
    });
});
