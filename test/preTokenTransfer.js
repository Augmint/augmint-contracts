const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");

let preToken;
let agreement;
let snapshotId;
const initialIssue = 1000000;

contract("PreToken transfer", accounts => {
    before(async () => {
        preToken = PreToken.at(PreToken.address);
        // account 0 used for issue/transfer tests
        agreement = {
            owner: accounts[3],
            hash: "0x36517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000
        };
        await preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap);

        await preToken.issueTo(agreement.owner, initialIssue);
    });

    beforeEach(async function() {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function() {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("should transfer to an account which has no agreement yet", async function() {
        const to = accounts[4];
        const [supplyBefore, ownerBalBefore] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to)
        ]);

        const tx = await preToken.transfer(to, initialIssue, { from: agreement.owner });
        testHelpers.logGasUse(this, tx, "PreToken.transfer");

        const [supplyAfter, agreementAfter, ownerBalAfter, toBalAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.agreements(to),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to),
            testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to, amount: initialIssue })
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.toString());
        assert.equal(ownerBalAfter.toString(), ownerBalBefore.sub(initialIssue).toString());
        assert.equal(toBalAfter.toNumber(), initialIssue);

        assert.equal(agreementAfter[0].toNumber(), initialIssue);
        assert.equal(agreementAfter[1], agreement.hash);
        assert.equal(agreementAfter[2].toNumber(), agreement.discount);
        assert.equal(agreementAfter[3].toNumber(), agreement.cap);
    });

    it("should transfer to an account which has the same agreement", async function() {
        const to = accounts[4];
        const transferAmount2 = 100;

        // first transfer to an account w/o agreement ("copy" agreement)
        const tx1 = await preToken.transfer(to, initialIssue, { from: agreement.owner });
        testHelpers.logGasUse(this, tx1, "PreToken.transfer");

        // issue a bit more to the from account to have something to transfer
        const tx2 = await preToken.issueTo(agreement.owner, transferAmount2);
        testHelpers.logGasUse(this, tx2, "PreToken.issueTo");

        // second transfer to same account
        const tx3 = await preToken.transfer(to, transferAmount2, { from: agreement.owner });
        testHelpers.logGasUse(this, tx3, "PreToken.transfer");

        await testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to, amount: transferAmount2 });
    });

    it("should tansfer 0 amount (voting) to an account w/o agreement", async function() {
        const to = accounts[4];
        const amount = 0;

        const tx = await preToken.transfer(to, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx, "PreToken.transfer");

        const [agreementAfter] = await Promise.all([
            preToken.agreements(to),
            testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to, amount })
        ]);

        assert.equal(agreementAfter[0].toString(), amount.toString());
        assert.equal(agreementAfter[1], "0x0000000000000000000000000000000000000000000000000000000000000000");
        assert.equal(agreementAfter[2].toNumber(), "0");
        assert.equal(agreementAfter[3].toNumber(), "0");
    });

    it("should tansfer 0 amount (voting) to an account with a different agreement", async function() {
        const amount = 0;
        const agreement2 = {
            owner: accounts[4],
            hash: "0x36517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000
        };

        await preToken.addAgreement(agreement2.owner, agreement2.hash, agreement2.discount, agreement2.cap);

        const tx2 = await preToken.transfer(agreement2.owner, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx2, "PreToken.transfer");

        await testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to: agreement2.owner, amount });
    });

    it("should NOT transfer to an account which has a different agreement", async function() {
        const agreement2 = {
            owner: accounts[4],
            hash: "0x66517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000
        };

        await preToken.addAgreement(agreement2.owner, agreement2.hash, agreement2.discount, agreement2.cap);

        await testHelpers.expectThrow(preToken.transfer(agreement2.owner, initialIssue, { from: agreement.owner }));
    });

    it("should NOT transfer less than balance", async function() {
        const to = accounts[4];
        const amount = initialIssue - 1;
        await testHelpers.expectThrow(preToken.transfer(to, amount, { from: agreement.owner }));
    });

    it("should NOT transfer more than balance", async function() {
        const to = accounts[4];
        const amount = initialIssue + 1;
        await testHelpers.expectThrow(preToken.transfer(to, amount, { from: agreement.owner }));
    });

    it("should NOT transfer to 0x0", async function() {
        const to = "0x0";
        await testHelpers.expectThrow(preToken.transfer(to, initialIssue, { from: agreement.owner }));
    });

    it("should NOT transfer if has no agreement", async function() {
        const to = accounts[5];
        const from = accounts[6];
        const amount = 0;
        await testHelpers.expectThrow(preToken.transfer(to, amount, { from }));
    });

    it("should transferFrom", async function() {
        const to = accounts[4];
        const from = agreement.owner;
        const [supplyBefore, ownerBalBefore] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to)
        ]);

        const tx = await preToken.transferFrom(from, to, initialIssue, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "PreToken.transfer");

        const [supplyAfter, agreementAfter, ownerBalAfter, toBalAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.agreements(to),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to),
            testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to, amount: initialIssue })
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.toString());
        assert.equal(ownerBalAfter.toString(), ownerBalBefore.sub(initialIssue).toString());
        assert.equal(toBalAfter.toNumber(), initialIssue);

        assert.equal(agreementAfter[0].toNumber(), initialIssue);
        assert.equal(agreementAfter[1], agreement.hash);
        assert.equal(agreementAfter[2].toNumber(), agreement.discount);
        assert.equal(agreementAfter[3].toNumber(), agreement.cap);
    });

    it("only permitted should transferFrom", async function() {
        const to = accounts[4];
        const from = agreement.owner;

        await testHelpers.expectThrow(preToken.transferFrom(from, to, initialIssue, { from: accounts[1] }));
    });
});
