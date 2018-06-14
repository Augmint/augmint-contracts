const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");
const AugmintToken = artifacts.require("./generic/AugmintToken.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const SB_setFeeAccount = artifacts.require("./scriptTests/SB_setFeeAccount.sol");

let augmintToken;
let stabilityBoardProxy;

contract("AugmintToken tests", accounts => {
    before(async () => {
        augmintToken = tokenTestHelpers.augmintToken;
        stabilityBoardProxy = StabilityBoardProxy.at(StabilityBoardProxy.address);
    });

    it("shouldn't create a token contract without feeAccount", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                accounts[0],
                "Augmint Crypto Euro", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                0 // feeaccount
            )
        );
    });

    it("shouldn't create a token contract without token name", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                accounts[0],
                "", // name
                "AEUR", // symbol
                "EUR", // peggedSymbol
                2, // decimals
                tokenTestHelpers.feeAccount.address
            )
        );
    });

    it("shouldn't create a token contract without token symbol", async function() {
        await testHelpers.expectThrow(
            AugmintToken.new(
                accounts[0],
                "Augmint Crypto Euro", // name
                "", // symbol
                "EUR", // peggedSymbol
                2, // decimals,
                tokenTestHelpers.feeAccount.address
            )
        );
    });

    it("should change feeAccount", async function() {
        const newFeeAccount = accounts[2];
        const setFeeAccountScript = await SB_setFeeAccount.new(augmintToken.address, newFeeAccount);

        await stabilityBoardProxy.sign(setFeeAccountScript.address);
        const executeTx = await stabilityBoardProxy.execute(setFeeAccountScript.address);

        testHelpers.logGasUse(this, executeTx, "multiSig.execute - setFeeAccount");

        const [actualFeeAccount] = await Promise.all([
            augmintToken.feeAccount(),
            testHelpers.assertEvent(augmintToken, "FeeAccountChanged", {
                newFeeAccount
            })
        ]);

        assert.equal(actualFeeAccount, newFeeAccount);
    });

    it("should not call setFeeAccount directly", async function() {
        const newFeeAccount = accounts[2];
        await testHelpers.expectThrow(augmintToken.setFeeAccount(newFeeAccount, { from: accounts[1] }));
    });
});
