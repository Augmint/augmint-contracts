const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");

const BN = web3.utils.BN;

let preToken;
let testAgreement; // used for test failing

function parseAgreement(agreementArray) {
    return agreementArray
        .filter((agreementTuple) => !agreementTuple[1].eq(0))
        .map((tuple) => {
            return {
                id: tuple[0].toNumber(),
                owner: "0x" + tuple[1].toString(16).padStart(40, "0"),
                balance: tuple[2].toNumber(),
                hash: "0x" + tuple[3].toString(16).padStart(64, "0"),
                discount: tuple[4].toNumber(),
                cap: tuple[5].toNumber(),
            };
        });
}

contract("PreToken", (accounts) => {
    before(async () => {
        preToken = await PreToken.at(PreToken.address);

        testAgreement = {
            owner: accounts[8],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000008",
            discount: 800000,
            cap: 20000000,
        };
        await preToken.addAgreement(testAgreement.owner, testAgreement.hash, testAgreement.discount, testAgreement.cap);
    });

    it("should add an agreement", async function () {
        const agreement = {
            owner: accounts[3],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
            discount: 800000,
            cap: 20000000,
        };

        const agreementsCountBefore = (await preToken.getAgreementsCount()).toNumber();

        const tx = await preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap);
        testHelpers.logGasUse(this, tx, "addAgreement");

        const [
            agreementsCountAfter,
            actualAgreementArray,
            actualAgreementOwnerHash,
            actualAgreementGetter,
        ] = await Promise.all([
            preToken.getAgreementsCount().then((res) => res.toNumber()),
            preToken.agreements(agreement.hash),
            preToken.agreementOwners(agreement.owner),
            preToken.getAgreements(agreementsCountBefore, 1),
            testHelpers.assertEvent(preToken, "NewAgreement", {
                owner: agreement.owner,
                agreementHash: agreement.hash,
                discount: agreement.discount.toString(),
                valuationCap: agreement.cap.toString(),
            }),
        ]);
        const parsedAgreement = parseAgreement(actualAgreementGetter)[0];

        assert.equal(agreementsCountAfter, agreementsCountBefore + 1);

        assert.equal(parsedAgreement.id, agreementsCountBefore);
        assert.equal(parsedAgreement.owner, agreement.owner.toLowerCase(), "Agreement owner shoud be set (via getter)");
        assert.equal(parsedAgreement.hash, agreement.hash);
        assert.equal(parsedAgreement.discount, agreement.discount.toString());
        assert.equal(parsedAgreement.cap, agreement.cap);

        assert.equal(actualAgreementOwnerHash, agreement.hash);

        assert.equal(actualAgreementArray[0], agreement.owner, "Agreement owner shoud be set in contract array");
        assert.equal(actualAgreementArray[1].toString(), "0");
        assert.equal(actualAgreementArray[2].toNumber(), agreement.discount);
        assert.equal(actualAgreementArray[3].toNumber(), agreement.cap);
    });

    it("Should list agreements", async function () {
        const agreement1 = {
            owner: accounts[4],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
            discount: 800000,
            cap: 20000000,
        };

        const agreement2 = {
            owner: accounts[5],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
            discount: 900000,
            cap: 25000000,
        };

        const agreementsCountBefore = (await preToken.getAgreementsCount()).toNumber();

        const tx1 = await preToken.addAgreement(agreement1.owner, agreement1.hash, agreement1.discount, agreement1.cap);
        testHelpers.logGasUse(this, tx1, "addAgreement");

        await testHelpers.assertEvent(preToken, "NewAgreement", {
            owner: agreement1.owner,
            agreementHash: agreement1.hash,
            discount: agreement1.discount.toString(),
            valuationCap: agreement1.cap.toString(),
        });

        const tx2 = await preToken.addAgreement(agreement2.owner, agreement2.hash, agreement2.discount, agreement2.cap);
        testHelpers.logGasUse(this, tx2, "addAgreement");

        const [agreementsCountAfter, agreementsAfter] = await Promise.all([
            preToken.getAgreementsCount().then((res) => res.toNumber()),

            preToken.getAgreements(agreementsCountBefore, 2),
            testHelpers.assertEvent(preToken, "NewAgreement", {
                owner: agreement2.owner,
                agreementHash: agreement2.hash,
                discount: agreement2.discount.toString(),
                valuationCap: agreement2.cap.toString(),
            }),
        ]);

        const parsedAgreements = parseAgreement(agreementsAfter);

        assert.equal(agreementsCountAfter, agreementsCountBefore + 2);

        assert.equal(parsedAgreements[0].id, agreementsCountBefore);
        assert.equal(parsedAgreements[0].owner, agreement1.owner.toLowerCase(), "Owner 1 should be set");
        assert.equal(parsedAgreements[0].hash, agreement1.hash);
        assert.equal(parsedAgreements[0].discount, agreement1.discount.toString());
        assert.equal(parsedAgreements[0].cap, agreement1.cap.toString());

        assert.equal(parsedAgreements[1].id, agreementsCountBefore + 1);
        assert.equal(parsedAgreements[1].owner, agreement2.owner.toLowerCase(), "Owner 2 should be set");
        assert.equal(parsedAgreements[1].hash, agreement2.hash);
        assert.equal(parsedAgreements[1].discount, agreement2.discount.toString());
        assert.equal(parsedAgreements[1].cap, agreement2.cap.toString());
    });

    it("should NOT add an agreement to 0x0 account", async function () {
        const agreement = {
            owner: "0x0000000000000000000000000000000000000000",
            hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
            discount: 800000,
            cap: 20000000,
        };

        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("should NOT add an agreement with 0 discount", async function () {
        const agreement = {
            owner: accounts[6],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000005",
            discount: 0,
            cap: 20000000,
        };

        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("should NOT add an agreement without agreementHash", async function () {
        const agreement = {
            owner: accounts[6],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            discount: 800000,
            cap: 20000000,
        };

        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("should NOT add an agreement if owner already has one", async function () {
        const agreement = {
            owner: accounts[6],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000006",
            discount: 800000,
            cap: 20000000,
        };
        const tx = await preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap);
        testHelpers.logGasUse(this, tx, "addAgreement");

        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap)
        );
    });

    it("add agreement should be only via multiSig", async function () {
        const agreement = {
            owner: accounts[7],
            hash: "0x0000000000000000000000000000000000000000000000000000000000000007",
            discount: 800000,
            cap: 20000000,
        };
        await testHelpers.expectThrow(
            preToken.addAgreement(agreement.owner, agreement.hash, agreement.discount, agreement.cap, {
                from: accounts[1],
            })
        );
    });

    it("should issueTo an account with agreement", async function () {
        const amount = new BN(1000);
        const supplyBefore = await preToken.totalSupply();

        const tx = await preToken.issueTo(testAgreement.hash, amount);
        testHelpers.logGasUse(this, tx, "issueTo");

        const [supplyAfter, balanceAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(testAgreement.owner),
            testHelpers.assertEvent(preToken, "Transfer", {
                from: "0x0000000000000000000000000000000000000000",
                to: testAgreement.owner,
                amount: amount.toString(),
            }),
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.add(amount).toString());
        assert.equal(balanceAfter.toString(), amount.toString());
    });

    it("should NOT issueTo a non existing agreement", async function () {
        await testHelpers.expectThrow(
            preToken.issueTo("0x0000000000000000000000000000000000000000000000000000000000000007", 1000)
        );
    });

    it("only permitted should call issueTo", async function () {
        await testHelpers.expectThrow(preToken.issueTo(testAgreement.owner, 1000, { from: accounts[1] }));
    });

    it("should burnFrom an account with agreement", async function () {
        const amount = new BN(100);
        const [supplyBefore, balanceBefore] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(testAgreement.owner),
        ]);

        const tx = await preToken.burnFrom(testAgreement.hash, amount);
        testHelpers.logGasUse(this, tx, "burnFrom");

        const [supplyAfter, balanceAfter] = await Promise.all([
            preToken.totalSupply(),
            preToken.balanceOf(testAgreement.owner),
            testHelpers.assertEvent(preToken, "Transfer", {
                to: "0x0000000000000000000000000000000000000000",
                from: testAgreement.owner,
                amount: amount.toString(),
            }),
        ]);

        assert.equal(supplyAfter.toString(), supplyBefore.sub(amount).toString());
        assert.equal(balanceAfter.toString(), balanceBefore.sub(amount).toString());
    });

    it("shouldn't burnFrom more than balance", async function () {
        const balanceBefore = await preToken.balanceOf(testAgreement.owner);

        await testHelpers.expectThrow(preToken.burnFrom(testAgreement.hash, balanceBefore.add(new BN(1))));
    });

    it("shouldn't burnFrom 0 amount", async function () {
        await testHelpers.expectThrow(preToken.burnFrom(testAgreement.hash, 0));
    });

    it("only allowed should burnFrom", async function () {
        await testHelpers.expectThrow(preToken.burnFrom(testAgreement.hash, 1, { from: accounts[1] }));
    });
});
