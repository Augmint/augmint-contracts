const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const loanTestHelpers = require("./helpers/loanTestHelpers.js");
const ratesTestHelpers = require("./helpers/ratesTestHelpers.js");

let loanManager = null;
let loanProduct = null;

let CHUNK_SIZE = 20;

contract("loanManager  tests", accounts => {
    before(async function() {
        loanManager = loanTestHelpers.loanManager;

        loanProduct = {
            // assuming prod attributes are same order as array returned
            minDisbursedAmount: 3000,
            term: 86400,
            discountRate: 970000,
            collateralRatio: 850000,
            defaultingFeePt: 50000,
            isActive: true
        };
        await loanManager.addLoanProduct(
            loanProduct.term,
            loanProduct.discountRate,
            loanProduct.collateralRatio,
            loanProduct.minDisbursedAmount,
            loanProduct.defaultingFeePt,
            loanProduct.isActive,
            { from: accounts[0] }
        );

        const res = await testHelpers.assertEvent(loanManager, "LoanProductAdded", {
            productId: x => x
        });
        loanProduct.id = res.productId;
    });

    it("Verifies default test loanproducts", async function() {
        // correlates with loan products set up in localTest_initialSetup.sol

        // IRPA: Interest Rate Per Annum : the percentage value on the UI
        // LPDR: Loan Product Discount Rate : uint32 discountRate constructor parameter

        // IRPA = (1_000_000 / LPDR - 1) * (365 / termInDays)
        // LPDR = 1_000_000 / (IRPA * termInDays / 365 + 1)

        const toLdpr = (irpa, termInDays) => Math.ceil(1000000 / (irpa * termInDays / 365 + 1))

        const p = await loanTestHelpers.getProductsInfo(0, CHUNK_SIZE);
        assert.equal(p[0].discountRate.toNumber(), toLdpr(0.17, 365))
        assert.equal(p[1].discountRate.toNumber(), toLdpr(0.165, 180))
        assert.equal(p[2].discountRate.toNumber(), toLdpr(0.16, 90))
        assert.equal(p[3].discountRate.toNumber(), toLdpr(0.155, 60))
        assert.equal(p[4].discountRate.toNumber(), toLdpr(0.15, 30))
        assert.equal(p[5].discountRate.toNumber(), toLdpr(0.15, 14))
        assert.equal(p[6].discountRate.toNumber(), toLdpr(0.15, 7))
    });

    it("Should add new product allow listing from offset 0", async function() {
        const prod = {
            // assuming prod attributes are same order as array returned
            minDisbursedAmount: 3000,
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
        const productsInfo = await loanTestHelpers.getProductsInfo(0, CHUNK_SIZE);
        const productCount = (await loanManager.getProductCount()).toNumber();
        assert.equal(productsInfo.length, productCount);
        const lastProduct = productsInfo[productCount - 1];
        assert.equal(lastProduct.id.toNumber(), prod.id);
        assert.equal(lastProduct.term.toNumber(), prod.term);
        assert.equal(lastProduct.discountRate.toNumber(), prod.discountRate);
        assert.equal(lastProduct.collateralRatio.toNumber(), prod.collateralRatio);
        assert.equal(lastProduct.minDisbursedAmount.toNumber(), prod.minDisbursedAmount);
        assert.equal(lastProduct.defaultingFeePt.toNumber(), prod.defaultingFeePt);
        const expMaxLoanAmount = await tokenTestHelpers.monetarySupervisor.getMaxLoanAmount(
            lastProduct.minDisbursedAmount
        );
        assert.equal(lastProduct.maxLoanAmount.toNumber(), expMaxLoanAmount);
        assert.equal(lastProduct.isActive.toNumber(), prod.isActive ? 1 : 0);
    });

    it("Should allow listing products (offset > 0)", async function() {
        const prod = {
            // assuming prod attributes are same order as array returned
            minDisbursedAmount: 3000,
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

        const productsInfo = await loanTestHelpers.getProductsInfo(productCount - 1, CHUNK_SIZE);
        assert.equal(productsInfo.length, 1);

        const lastProduct = productsInfo[0];
        assert.equal(lastProduct.id.toNumber(), prod.id);
        assert.equal(lastProduct.term.toNumber(), prod.term);
        assert.equal(lastProduct.discountRate.toNumber(), prod.discountRate);
        assert.equal(lastProduct.collateralRatio.toNumber(), prod.collateralRatio);
        assert.equal(lastProduct.minDisbursedAmount.toNumber(), prod.minDisbursedAmount);
        assert.equal(lastProduct.defaultingFeePt.toNumber(), prod.defaultingFeePt);
        const expMaxLoanAmount = await tokenTestHelpers.monetarySupervisor.getMaxLoanAmount(
            lastProduct.minDisbursedAmount
        );
        assert.equal(lastProduct.maxLoanAmount.toNumber(), expMaxLoanAmount);
        assert.equal(lastProduct.isActive.toNumber(), prod.isActive ? 1 : 0);
    });

    it("Only allowed should add new product", async function() {
        await testHelpers.expectThrow(
            loanManager.addLoanProduct(86400, 970000, 850000, 3000, 50000, true, { from: accounts[1] })
        );
    });

    it("Should disable loan product", async function() {
        const tx = await loanManager.setLoanProductActiveState(loanProduct.id, false);
        testHelpers.logGasUse(this, tx, "setLoanProductActiveState");
        assert.equal(
            tx.logs[0].event,
            "LoanProductActiveStateChanged",
            "LoanProductActiveStateChanged event should be emitted"
        );
        assert.equal(tx.logs[0].args.newState, false, "new state should be false (event)");

        const prod = await loanManager.products(loanProduct.id);
        assert.equal(prod[5], false, "new state should be false");
    });

    it("Should enable loan product", async function() {
        const tx = await loanManager.setLoanProductActiveState(loanProduct.id, true);
        testHelpers.logGasUse(this, tx, "setLoanProductActiveState");
        assert.equal(
            tx.logs[0].event,
            "LoanProductActiveStateChanged",
            "LoanProductActiveStateChanged event should be emitted"
        );
        assert.equal(tx.logs[0].args.newState, true, "new state should be true (event)");

        const prod = await loanManager.products(loanProduct.id);
        assert.equal(prod[5], true, "new state should be true");
    });

    it("Only allowed should set loan product state", async function() {
        await testHelpers.expectThrow(
            loanManager.setLoanProductActiveState(loanProduct.id, true, { from: accounts[1] })
        );
    });

    it("Should allow to change rates and monetarySupervisor contract", async function() {
        const newRatesContract = ratesTestHelpers.rates.address;
        const newMonetarySupervisor = tokenTestHelpers.monetarySupervisor.address;
        const tx = await loanManager.setSystemContracts(newRatesContract, newMonetarySupervisor);
        testHelpers.logGasUse(this, tx, "setSystemContracts");

        const [actualRatesContract, actualMonetarySupervisor] = await Promise.all([
            loanManager.rates(),
            loanManager.monetarySupervisor(),
            testHelpers.assertEvent(loanManager, "SystemContractsChanged", { newRatesContract, newMonetarySupervisor })
        ]);

        assert.equal(actualRatesContract, newRatesContract);
        assert.equal(actualMonetarySupervisor, newMonetarySupervisor);
    });

    it("Only allowed should change rates and monetarySupervisor contracts", async function() {
        const newRatesContract = ratesTestHelpers.rates.address;
        const newMonetarySupervisor = tokenTestHelpers.monetarySupervisor.address;
        await testHelpers.expectThrow(
            loanManager.setSystemContracts(newRatesContract, newMonetarySupervisor, { from: accounts[1] })
        );
    });
});
