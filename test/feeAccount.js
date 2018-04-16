const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");

let feeAccountInstance;

contract("FeeAccount tests", accounts => {
    before(async () => {
        feeAccountInstance = tokenTestHelpers.feeAccount;
    });

    it("should be possible to set transfer fees ", async function() {
        const fee = { pt: 100000, max: 80, min: 90 };
        const tx = await feeAccountInstance.setTransferFees(fee.pt, fee.min, fee.max, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "setTransferFees");

        const [feePt, feeMin, feeMax] = await feeAccountInstance.transferFee();

        await testHelpers.assertEvent(feeAccountInstance, "TransferFeesChanged", {
            transferFeePt: fee.pt,
            transferFeeMin: fee.min,
            transferFeeMax: fee.max
        });

        assert.equal(feePt, fee.pt);
        assert.equal(feeMin, fee.min);
        assert.equal(feeMax, fee.max);
    });

    it("only allowed should set transfer fees ", async function() {
        await testHelpers.expectThrow(feeAccountInstance.setTransferFees(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("should be possible to withdraw from fee account"); // only for tests, this function should be removed
    it("only owner should withdraw from fee account");
});
