const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");
const preTokenTestHelpers = require("./helpers/preTokenTestHelpers");

let preToken;
let quorumSigners;

contract("PreToken", accounts => {
    before(async () => {
        preToken = PreToken.at(PreToken.address);
        quorumSigners = [accounts[0]];
    });

    it("should add an agreement", async function() {
        const agreement = {
            owner: accounts[1],
            hash: "0x26517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };

        await preTokenTestHelpers.addAgreement(this, quorumSigners, agreement);

        const [actualAgreement] = await Promise.all([
            preToken.agreements(agreement.owner),
            testHelpers.assertEvent(preToken, "NewAgreement", {
                to: agreement.owner,
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

    it("should NOT add an agreement to 0x0 account", async function() {
        const agreement = {
            owner: "0x0000000000000000000000000000000000000000",
            hash: "0x46517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };

        await testHelpers.expectThrow(preTokenTestHelpers.addAgreement(this, quorumSigners, agreement));
    });

    it("should NOT add an agreement without agreementHash", async function() {
        const agreement = {
            owner: accounts[2],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            discount: 800000,
            cap: 20000000
        };

        await testHelpers.expectThrow(preTokenTestHelpers.addAgreement(this, quorumSigners, agreement));
    });

    it("should NOT add an agreement if owner already has one", async function() {
        const agreement = {
            owner: accounts[3],
            hash: "0x46517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        await preTokenTestHelpers.addAgreement(this, quorumSigners, agreement);

        await testHelpers.expectThrow(preTokenTestHelpers.addAgreement(this, quorumSigners, agreement));
    });

    it("add agreement should be only via multiSig", async function() {
        const agreement = {
            owner: accounts[4],
            hash: "0x56517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("should issueTo an account with agreement", async function() {
        const agreement = {
            owner: accounts[5],
            hash: "0x46517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        const amount = 1000;
        const [supplyBefore] = await Promise.all([
            preToken.totalSupply(),
            preTokenTestHelpers.addAgreement(this, quorumSigners, agreement)
        ]);

        await preTokenTestHelpers.issueTo(this, quorumSigners, agreement.owner, amount);

        const [supplyAfter, balanceAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(agreement.owner),
            testHelpers.assertEvent(preToken, "Transfer", {
                from: "0x0000000000000000000000000000000000000000",
                to: agreement.owner,
                amount
            })
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.add(amount).toString());
        assert.equal(balanceAfter.toString(), amount.toString());
    });

    it("should NOT issueTo an account without an agreement", async function() {
        await testHelpers.expectThrow(preTokenTestHelpers.issueTo(this, quorumSigners, accounts[6], 1000));
    });

    it("only multiSig should call issueTo", async function() {
        const agreement = {
            owner: accounts[7],
            hash: "0x76517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 800000,
            cap: 20000000
        };
        await preTokenTestHelpers.addAgreement(this, quorumSigners, agreement);
        await testHelpers.expectThrow(preToken.issueTo(agreement.owner, 1000, { from: accounts[0] }));
    });
});
