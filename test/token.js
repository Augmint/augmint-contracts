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
                "Augmint Euro", // name
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
                "Augmint Euro", // name
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

    it("should change token name if caller has permission", async function() {
        const oldName = await augmintToken.name();

        await testHelpers.expectThrow(
            augmintToken.setName("Unauthorized Name", { from: accounts[1] })
        );
        assert.equal(await augmintToken.name(), oldName);

        const newName = "New Name for Old Token";
        await augmintToken.setName(newName, { from: accounts[0] });
        assert.equal(await augmintToken.name(), newName);

        // rename back to the original name
        await augmintToken.setName(oldName, { from: accounts[0] });
        assert.equal(await augmintToken.name(), oldName);
    });

    it("should change token symbol if caller has permission", async function() {
        const oldSymbol = await augmintToken.symbol();

        await testHelpers.expectThrow(
            augmintToken.setSymbol("UNAUTHORIZED", { from: accounts[1] })
        );
        assert.equal(await augmintToken.symbol(), oldSymbol);

        const newSymbol = "NEW";
        await augmintToken.setSymbol(newSymbol, { from: accounts[0] });
        assert.equal(await augmintToken.symbol(), newSymbol);

        // set back to the original symbol
        await augmintToken.setSymbol(oldSymbol, { from: accounts[0] });
        assert.equal(await augmintToken.symbol(), oldSymbol);
    });
});
