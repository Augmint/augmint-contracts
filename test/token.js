const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");

let augmintToken;

contract("AugmintToken tests", accounts => {
    before(async () => {
        augmintToken = tokenTestHelpers.augmintToken;
    });

    it("should be possible to set transfer fees ", async function() {
        const fee = { pt: 100000, max: 80, min: 90 };
        const tx = await augmintToken.setTransferFees(fee.pt, fee.min, fee.max, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "setTransferFees");

        const [feePt, feeMin, feeMax] = await augmintToken.getParams();

        await testHelpers.assertEvent(augmintToken, "TransferFeesChanged", {
            transferFeePt: fee.pt,
            transferFeeMin: fee.min,
            transferFeeMax: fee.max
        });

        assert.equal(feePt, fee.pt);
        assert.equal(feeMin, fee.min);
        assert.equal(feeMax, fee.max);
    });

    it("only allowed should set transfer fees ", async function() {
        await testHelpers.expectThrow(augmintToken.setTransferFees(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("all params should be accesible via getParams", async function() {
        const paramsOneByOne = await Promise.all([
            augmintToken.transferFeePt(),
            augmintToken.transferFeeMin(),
            augmintToken.transferFeeMax()
        ]);

        const paramsViaHelper = await augmintToken.getParams();

        assert.deepEqual(paramsOneByOne, paramsViaHelper);
    });
});
