const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");
const preTokenTestHelpers = require("./helpers/preTokenTestHelpers");

let preToken;
let agreement;
let quorumSigners;

contract("PreToken transfer", accounts => {
    before(async () => {
        preToken = PreToken.at(PreToken.address);
        // account 0 used for issue/transfer tests
        agreement = {
            owner: accounts[1],
            hash: "0x36517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000
        };
        quorumSigners = [accounts[0]];

        let txData = preTokenTestHelpers.preTokenWeb3Contract.methods
            .addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
            .encodeABI();
        await testHelpers.signAndExecute(preTokenTestHelpers.multiSig, preToken.address, quorumSigners, txData);

        txData = preTokenTestHelpers.preTokenWeb3Contract.methods.issueTo(agreement.owner, 1000000).encodeABI();
        await testHelpers.signAndExecute(preTokenTestHelpers.multiSig, preToken.address, quorumSigners, txData);
    });

    it("should transfer to an account which has no agreement yet", async function() {
        const to = accounts[2];
        const amount = 100;
        const [supplyBefore, ownerBalBefore] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to)
        ]);

        const tx = await preToken.transfer(to, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx, "transfer");

        const [supplyAfter, agreementAfter, ownerBalAfter, toBalAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.agreements(to),
            preToken.balanceOf(agreement.owner),
            preToken.balanceOf(to),
            testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to, amount })
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.toString());
        assert.equal(ownerBalAfter.toString(), ownerBalBefore.sub(amount).toString());
        assert.equal(toBalAfter.toString(), amount.toString());

        assert.equal(agreementAfter[0].toString(), amount.toString());
        assert.equal(agreementAfter[1], agreement.hash);
        assert.equal(agreementAfter[2].toNumber(), agreement.discount);
        assert.equal(agreementAfter[3].toNumber(), agreement.cap);
    });

    it("should transfer to an account which has the same agreement", async function() {
        const to = accounts[3];
        const amount = 100;

        // first transfer to an account w/o agreement (copy agreement)
        const tx1 = await preToken.transfer(to, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx1, "transfer");

        // second transfer to same account
        const tx2 = await preToken.transfer(to, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx2, "transfer");

        await testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to, amount });
    });

    it("should tansfer 0 amount (voting) to an account w/o agreement", async function() {
        const to = accounts[4];
        const amount = 0;

        const tx = await preToken.transfer(to, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx, "transfer");

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
            owner: accounts[5],
            hash: "0x36517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000
        };

        await preTokenTestHelpers.addAgreement(this, quorumSigners, agreement2);

        const tx2 = await preToken.transfer(agreement2.owner, amount, { from: agreement.owner });
        testHelpers.logGasUse(this, tx2, "transfer");

        await testHelpers.assertEvent(preToken, "Transfer", { from: agreement.owner, to: agreement2.owner, amount });
    });

    it("should NOT transfer to an account which has a different agreement", async function() {
        const amount = 100;
        const agreement2 = {
            owner: accounts[6],
            hash: "0x66517e28afd52e6a9fc53d6922833c67b02e339943d737f1abefa877ff69b68a",
            discount: 700000,
            cap: 15000000
        };

        await preTokenTestHelpers.addAgreement(this, quorumSigners, agreement2);
        await testHelpers.expectThrow(preToken.transfer(agreement2.owner, amount, { from: agreement.owner }));
    });

    it("should NOT transfer more than balance", async function() {
        const to = accounts[7];
        const amount = (await preToken.balanceOf(agreement.owner)).add(1);
        await testHelpers.expectThrow(preToken.transfer(to, amount));
    });
});
