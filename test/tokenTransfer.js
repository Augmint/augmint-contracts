const testHelpers = new require("./helpers/testHelpers.js");
const tokenTestHelpers = new require("./helpers/tokenTestHelpers.js");

const BN = web3.utils.BN;

let augmintToken = null;
let minFee, maxFee, feePt, minFeeAmount, maxFeeAmount;
let snapshotId;

contract("Transfer Augmint tokens tests", (accounts) => {
    before(async function () {
        augmintToken = tokenTestHelpers.augmintToken;

        await Promise.all([
            tokenTestHelpers.issueToken(accounts[0], accounts[0], 500000000),
            tokenTestHelpers.issueToken(accounts[0], accounts[1], 500000000),
        ]);

        const feeParams = await tokenTestHelpers.feeAccount.transferFee();
        feePt = feeParams.pt;
        minFee = feeParams.min;
        maxFee = feeParams.max;

        minFeeAmount = minFee.mul(testHelpers.PPM_DIV).div(feePt);
        maxFeeAmount = maxFee.mul(testHelpers.PPM_DIV).div(feePt);
    });

    beforeEach(async function () {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function () {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("Should be able to transfer tokens between accounts (without narrative, min fee)", async function () {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: minFeeAmount.sub(new BN(10)),
            narrative: "",
        });
    });

    it("Should be able to transfer tokens between accounts (with narrative, max fee)", async function () {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: maxFeeAmount.add(new BN(10)),
            narrative: "test narrative",
        });
    });

    it("transfer fee % should deducted when fee % is between min and max fee", async function () {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: maxFeeAmount.sub(new BN(10)),
            narrative: "",
        });
    });

    it("Should be able to transfer 0 amount without narrative", async function () {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: new BN(0),
            narrative: "",
        });
    });

    it("Should be able to transfer 0 with narrative", async function () {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: new BN(0),
            narrative: "test narrative",
        });
    });

    it("Shouldn't be able to transfer tokens when token balance is insufficient", async function () {
        await testHelpers.expectThrow(
            augmintToken.transfer(accounts[2], (await augmintToken.balanceOf(accounts[1])).add(new BN(1)), {
                from: accounts[1],
            })
        );
    });

    it("Should be able to transfer tokens between the same accounts", async function () {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[1],
            amount: new BN(100),
        });
    });

    it("Shouldn't be able to transfer to 0x0", async function () {
        await testHelpers.expectThrow(
            augmintToken.transfer("0x0000000000000000000000000000000000000000", 20000, {
                from: accounts[1],
            })
        );
    });

    it("should have zero fee if 'to' or 'from' is NoTransferFee", async function () {
        await tokenTestHelpers.feeAccount.grantPermission(accounts[0], web3.utils.asciiToHex("NoTransferFee"));
        await tokenTestHelpers.transferTest(this, {
            from: accounts[0],
            to: accounts[1],
            amount: new BN(10000),
            narrative: "",
            fee: new BN(0),
        });

        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[0],
            amount: new BN(10000),
            narrative: "transfer 0 test",
            fee: new BN(0),
        });
    });
});
