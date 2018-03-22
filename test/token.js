const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const AugmintToken = artifacts.require("./generic/AugmintToken.sol");

let augmintTokenInstance;

contract("AugmintToken tests", accounts => {
    before(async () => {
        augmintTokenInstance = tokenTestHelpers.augmintToken;
    });

    it("should be possible to set transfer fees ", async function() {
        const fee = { pt: 100000, max: 80, min: 90 };
        const tx = await augmintTokenInstance.setTransferFees(fee.pt, fee.min, fee.max, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "setTransferFees");

        const [feePt, feeMin, feeMax] = await augmintTokenInstance.transferFee();

        await testHelpers.assertEvent(augmintTokenInstance, "TransferFeesChanged", {
            transferFeePt: fee.pt,
            transferFeeMin: fee.min,
            transferFeeMax: fee.max
        });

        assert.equal(feePt, fee.pt);
        assert.equal(feeMin, fee.min);
        assert.equal(feeMax, fee.max);
    });

    it("only allowed should set transfer fees ", async function() {
        await testHelpers.expectThrow(augmintTokenInstance.setTransferFees(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("shouldn't create a token contract without feeAccount", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "Augmint Crypto Euro", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                0, // feeaccount
                2000 /* transferFeePt in parts per million = 0.2% */,
                200 /* min: 0.02 ACE */,
                50000 /* max fee: 5 ACE */
            )
        );
    });

    it("shouldn't create a token contract without token name", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                tokenTestHelpers.feeAccount,
                2000 /* transferFeePt in parts per million = 0.2% */,
                200 /* min: 0.02 ACE */,
                50000 /* max fee: 5 ACE */
            )
        );
    });

    it("shouldn't create a token contract without token symbol", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                "Augmint Crypto Euro", // name
                "", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                tokenTestHelpers.feeAccount,
                2000 /* transferFeePt in parts per million = 0.2% */,
                200 /* min: 0.02 ACE */,
                50000 /* max fee: 5 ACE */
            )
        );
    });
});
