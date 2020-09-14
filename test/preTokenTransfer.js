const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");

const BN = web3.utils.BN;

let preToken;
let agreement;
let snapshotId;
const initialIssue = new BN(1000000);

contract("PreToken transfer", (accounts) => {
    before(async () => {
        preToken = await PreToken.at(PreToken.address);
        agreement = {
            owner: accounts[3],
            hash: "0x36517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000,
        };
        await preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap);

        await preToken.issueTo(agreement.hash, initialIssue);
    });

    beforeEach(async function () {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function () {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("should transfer to an account which has no agreement yet", async function () {
        const to = accounts[4];
        const supplyBefore = await preToken.totalSupply();

        const tx = await preToken.transfer(to, initialIssue, { from: agreement.owner });
        testHelpers.logGasUse(this, tx, "PreToken.transfer");

        const [
            supplyAfter,
            agreementAfter,
            fromAgreementOwnerHashAfter,
            toAgreementOwnerHashAfter,
            fromBalAfter,
            toBalAfter,
        ] = await Promise.all([
            preToken.totalSupply(),
            preToken.agreements(agreement.hash),
            preToken.agreementOwners(agreement.owner),
            preToken.agreementOwners(to),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to),
            testHelpers.assertEvent(preToken, "Transfer", {
                from: agreement.owner,
                to,
                amount: initialIssue.toString(),
            }),
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.toString(), "Total supply should NOT change");
        assert.equal(toBalAfter.toString(), initialIssue.toString(), "Recevier balance should update");
        assert.equal(fromBalAfter.toString(), "0");

        assert.equal(fromAgreementOwnerHashAfter, "0x0000000000000000000000000000000000000000000000000000000000000000");
        assert.equal(toAgreementOwnerHashAfter, agreement.hash);

        assert.equal(agreementAfter[0], to);
        assert.equal(agreementAfter[1].toString(), initialIssue.toString());
        assert.equal(agreementAfter[2].toNumber(), agreement.discount);
        assert.equal(agreementAfter[3].toNumber(), agreement.cap);
    });

    it("should NOT transfer 0 amount", async function () {
        const to = accounts[4];
        const amount = 0;

        await testHelpers.expectThrow(preToken.transfer(to, amount, { from: agreement.owner }));
    });

    it("should NOT transfer to an account which has an agreement", async function () {
        const agreement2 = {
            owner: accounts[4],
            hash: "0x66517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000,
        };

        await preToken.addAgreement(agreement2.owner, agreement2.hash, agreement2.discount, agreement2.cap);

        await testHelpers.expectThrow(preToken.transfer(agreement2.owner, initialIssue, { from: agreement.owner }));
    });

    it("should NOT transfer less than balance", async function () {
        const to = accounts[4];
        const amount = initialIssue.sub(new BN(1));
        await testHelpers.expectThrow(preToken.transfer(to, amount, { from: agreement.owner }));
    });

    it("should NOT transfer more than balance", async function () {
        const to = accounts[4];
        const amount = initialIssue.add(new BN(1));
        await testHelpers.expectThrow(preToken.transfer(to, amount, { from: agreement.owner }));
    });

    it("should NOT transfer to 0x0", async function () {
        const to = "0x0000000000000000000000000000000000000000";
        await testHelpers.expectThrow(preToken.transfer(to, initialIssue, { from: agreement.owner }));
    });

    it("should NOT transfer if has no agreement", async function () {
        const to = accounts[5];
        const from = accounts[6];
        const amount = 0;
        await testHelpers.expectThrow(preToken.transfer(to, amount, { from }));
    });

    it("should transferFrom", async function () {
        const to = accounts[4];
        const fromHash = agreement.hash;
        const supplyBefore = await preToken.totalSupply();

        const tx = await preToken.transferAgreement(fromHash, to, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "PreToken.transfer");

        const [supplyAfter, agreementAfter, ownerBalAfter, toBalAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.agreements(agreement.hash),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to),
            testHelpers.assertEvent(preToken, "Transfer", {
                from: agreement.owner,
                to,
                amount: initialIssue.toString(),
            }),
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.toString(), "Total supply should NOT change");
        assert.equal(ownerBalAfter.toNumber(), 0);
        assert.equal(toBalAfter.toString(), initialIssue.toString(), "Recevier balance should update");

        assert.equal(agreementAfter[0], to);
        assert.equal(agreementAfter[1].toString(), initialIssue.toString());
        assert.equal(agreementAfter[2].toNumber(), agreement.discount);
        assert.equal(agreementAfter[3].toNumber(), agreement.cap);
    });

    it("only permitted should transferFrom", async function () {
        const to = accounts[4];
        const fromHash = agreement.owner;

        await testHelpers.expectThrow(preToken.transferAgreement(fromHash, to, { from: accounts[1] }));
    });
});
