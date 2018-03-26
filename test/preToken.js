const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");

let preToken;

contract("PreToken", accounts => {
    before(() => {
        preToken = PreToken.at(PreToken.address);
    });

    it("should add an agreement", async function() {
        const agreement = {
            to: accounts[1],
            hash: "0x26517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        const tx = await preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap);
        testHelpers.logGasUse(this, tx, "addAgreement");

        const [actualAgreement] = await Promise.all([
            preToken.agreements(agreement.to),
            testHelpers.assertEvent(preToken, "NewAgreement", {
                to: agreement.to,
                agreementHash: agreement.hash,
                discount: agreement.discount,
                valuationCap: agreement.cap
            })
        ]);

        assert.equal(actualAgreement[0].toString(), "0");
        assert.equal(actualAgreement[1], agreement.hash);
        assert.equal(actualAgreement[2].toNumber(), agreement.discount);
        assert.equal(actualAgreement[3].toNumber(), agreement.cap);
    });

    it("should NOT add an agreement without agreementHash", async function() {
        const agreement = {
            to: accounts[2],
            hash: "0x0",
            discount: 800000,
            cap: 20000000
        };
        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("should NOT add an agreement if to: already has one", async function() {
        const agreement = {
            to: accounts[3],
            hash: "0x46517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        const tx = await preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap);
        testHelpers.logGasUse(this, tx, "addAgreement");
        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("only permitted should add an agreement", async function() {
        const agreement = {
            to: accounts[4],
            hash: "0x56517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap, {
                from: accounts[1]
            })
        );
    });

    it("should issueTo an account with agreement", async function() {
        const agreement = {
            to: accounts[5],
            hash: "0x46517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        const amount = 1000;
        const [tx1, supplyBefore] = await Promise.all([
            preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap),
            preToken.totalSupply()
        ]);
        testHelpers.logGasUse(this, tx1, "addAgreement");

        const tx2 = await preToken.issueTo(agreement.to, amount);
        const [supplyAfter, balanceAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(agreement.to),
            testHelpers.assertEvent(preToken, "Transfer", {
                from: "0x0000000000000000000000000000000000000000",
                to: agreement.to,
                amount
            })
        ]);
        testHelpers.logGasUse(this, tx2, "issueTo");

        assert.equal(supplyAfter.toString(), supplyBefore.add(amount).toString());
        assert.equal(balanceAfter.toString(), amount.toString());
    });

    it("should NOT issueTo an account without an agreement", async function() {
        await testHelpers.expectThrow(preToken.issueTo(accounts[6], 1000));
    });

    it("only permitted should issueTo", async function() {
        const agreement = {
            to: accounts[7],
            hash: "0x76517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };

        await preToken.addAgreement(agreement.to, agreement.hash, agreement.discount, agreement.cap),
        await testHelpers.expectThrow(preToken.issueTo(agreement.to, 1000, { from: accounts[1] }));
    });
});
