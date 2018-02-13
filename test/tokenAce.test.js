const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const testHelper = require("./helpers/testHelper.js");

let tokenAce;

contract("TokenAce tests", accounts => {
    before(async () => {
        tokenAce = await tokenAceTestHelper.newTokenAceMock();
    });

    it("should be possible to set transfer fees ", async function() {
        const fee = { pt: 100000, max: 80, min: 90 };
        const tx = await tokenAce.setTransferFees(fee.pt, fee.min, fee.max, { from: accounts[0] });
        testHelper.logGasUse(this, tx, "setTransferFees");

        const [feePt, feeMin, feeMax] = await tokenAce.getParams();

        await testHelper.assertEvent(tokenAce, "TransferFeesChanged", {
            transferFeePt: fee.pt,
            transferFeeMin: fee.min,
            transferFeeMax: fee.max
        });

        assert.equal(feePt, fee.pt);
        assert.equal(feeMin, fee.min);
        assert.equal(feeMax, fee.max);
    });

    it("only allowed should set transfer fees ", async function() {
        await testHelper.expectThrow(tokenAce.setTransferFees(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("all params should be accesible via getParams", async function() {
        const paramsOneByOne = await Promise.all([
            tokenAce.transferFeePt(),
            tokenAce.transferFeeMin(),
            tokenAce.transferFeeMax()
        ]);

        const paramsViaHelper = await tokenAce.getParams();

        assert.deepEqual(paramsOneByOne, paramsViaHelper);
    });
});
