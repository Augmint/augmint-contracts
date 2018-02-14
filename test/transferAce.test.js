const testHelper = new require("./helpers/testHelper.js");
const tokenTestHelpers = new require("./helpers/tokenTestHelpers.js");

let augmintToken = null;
let minFee, maxFee, feePt, minFeeAmount, maxFeeAmount;

contract("Transfer Augmint tokens tests", accounts => {
    before(async function() {
        augmintToken = await tokenTestHelpers.getAugmintToken();
        await tokenTestHelpers.issueToReserve(1000000000);
        await Promise.all([
            tokenTestHelpers.withdrawFromReserve(accounts[0], 500000000),
            tokenTestHelpers.withdrawFromReserve(accounts[1], 500000000)
        ]);
        [feePt, minFee, maxFee] = await augmintToken.getParams();
        minFeeAmount = minFee.div(feePt).mul(1000000);
        maxFeeAmount = maxFee.div(feePt).mul(1000000);
    });

    it("Should be able to transfer ACE between accounts (without narrative, min fee)", async function() {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: minFeeAmount.sub(10),
            narrative: ""
        });
    });

    it("Should be able to transfer ACE between accounts (with narrative, max fee)", async function() {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: maxFeeAmount.add(10),
            narrative: "test narrative"
        });
    });

    it("transfer fee % should deducted when fee % is between min and max fee", async function() {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: maxFeeAmount.sub(10),
            narrative: ""
        });
    });

    it("Should be able to transfer 0 amount without narrative", async function() {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: 0,
            narrative: ""
        });
    });

    it("Should be able to transfer 0 with narrative", async function() {
        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: 0,
            narrative: "test narrative"
        });
    });

    it("Shouldn't be able to transfer ACE when ACE balance is insufficient", async function() {
        await testHelper.expectThrow(
            augmintToken.transfer(accounts[2], (await augmintToken.balanceOf(accounts[1])).plus(1), {
                from: accounts[1]
            })
        );
    });

    it("Shouldn't be able to transfer ACE between the same accounts", async function() {
        await testHelper.expectThrow(
            augmintToken.transfer(accounts[1], 20000, {
                from: accounts[1]
            })
        );
    });

    it("Shouldn't be able to transfer to 0x0", async function() {
        await testHelper.expectThrow(
            augmintToken.transfer("0x0", 20000, {
                from: accounts[1]
            })
        );
    });

    it("should have zero fee if 'to' or from is NoFeeTransferContracts", async function() {
        await augmintToken.grantPermission(accounts[0], "NoFeeTransferContracts");
        await tokenTestHelpers.transferTest(this, {
            from: accounts[0],
            to: accounts[1],
            amount: 10000,
            narrative: "",
            fee: 0
        });

        await tokenTestHelpers.transferTest(this, {
            from: accounts[1],
            to: accounts[0],
            amount: 10000,
            narrative: "transfer 0 test",
            fee: 0
        });
    });
});
