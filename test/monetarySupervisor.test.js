const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const augmintTokenTestHelpers = require("./helpers/tokenAceTestHelper.js");
const testHelper = require("./helpers/testHelper.js");

const NULL_ACC = "0x0000000000000000000000000000000000000000";
let augmintToken = null;
let monetarySupervisor = null;

contract("MonetarySupervisor tests", accounts => {
    before(async () => {
        augmintToken = await augmintTokenTestHelpers.getAugmintToken();
        monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
    });

    it("should be possible to issue new tokens to reserve", async function() {
        const amount = 100000;
        const [totalSupplyBefore, reserveBalBefore, issuedByMonetaryBoardBefore] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(AugmintReserves.address),
            monetarySupervisor.issuedByMonetaryBoard()
        ]);

        const tx = await monetarySupervisor.issueToReserve(amount);
        testHelper.logGasUse(this, tx, "issue");

        await testHelper.assertEvent(augmintToken, "Transfer", {
            from: NULL_ACC,
            to: AugmintReserves.address,
            amount: amount
        });

        const [totalSupply, issuedByMonetaryBoard, reserveBal] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(AugmintReserves.address),
            monetarySupervisor.issuedByMonetaryBoard()
        ]);

        assert.equal(
            totalSupply.toString(),
            totalSupplyBefore.add(amount).toString(),
            "Totalsupply should be increased with issued amount"
        );
        assert.equal(
            issuedByMonetaryBoard.toString(),
            issuedByMonetaryBoardBefore.add(amount).toString(),
            "issuedByMonetaryBoard should be increased with issued amount"
        );
        assert.equal(
            reserveBal.toString(),
            reserveBalBefore.add(amount).toString(),
            "Reserve balance should be increased with issued amount"
        );
    });

    it("only allowed should issue tokens", async function() {
        await testHelper.expectThrow(monetarySupervisor.issueToReserve(1000, { from: accounts[1] }));
    });

    it("should be possible to burn tokens from reserve", async function() {
        const amount = 9000000;
        await monetarySupervisor.issueToReserve(amount);
        const [totalSupplyBefore, reserveBalBefore, issuedByMonetaryBoardBefore] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(AugmintReserves.address),
            monetarySupervisor.issuedByMonetaryBoard()
        ]);

        const tx = await monetarySupervisor.burnFromReserve(amount, { from: accounts[0] });
        testHelper.logGasUse(this, tx, "burnFromReserve");

        await testHelper.assertEvent(augmintToken, "Transfer", {
            from: AugmintReserves.address,
            to: NULL_ACC,
            amount: amount
        });

        const [totalSupply, issuedByMonetaryBoard, reserveBal] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(AugmintReserves.address),
            monetarySupervisor.issuedByMonetaryBoard()
        ]);
        assert.equal(
            totalSupply.toString(),
            totalSupplyBefore.sub(amount).toString(),
            "Totalsupply should be decreased with burnt amount"
        );
        assert.equal(
            issuedByMonetaryBoard.toString(),
            issuedByMonetaryBoardBefore.sub(amount).toString(),
            "issuedByMonetaryBoard should be decreased with burnt amount"
        );
        assert.equal(
            reserveBal.toString(),
            reserveBalBefore.sub(amount).toString(),
            "Reserve balance should be decreased with burnt amount"
        );
    });

    it("only allowed should burn tokens", async function() {
        await monetarySupervisor.issueToReserve(2000);
        await testHelper.expectThrow(monetarySupervisor.burnFromReserve(1000, { from: accounts[1] }));
    });

    it("should be possible to set parameters", async function() {
        const params = { ltdDifferenceLimit: 12345, allowedLtdDifferenceAmount: 1234 };
        const tx = await monetarySupervisor.setParams(params.ltdDifferenceLimit, params.allowedLtdDifferenceAmount, {
            from: accounts[0]
        });
        testHelper.logGasUse(this, tx, "setParams");

        await testHelper.assertEvent(monetarySupervisor, "ParamsChanged", {
            ltdDifferenceLimit: params.ltdDifferenceLimit,
            allowedLtdDifferenceAmount: params.allowedLtdDifferenceAmount
        });

        const [ltdDifferenceLimit, allowedLtdDifferenceAmount] = await Promise.all([
            monetarySupervisor.ltdDifferenceLimit(),
            monetarySupervisor.allowedLtdDifferenceAmount()
        ]);

        assert.equal(ltdDifferenceLimit, params.ltdDifferenceLimit);
        assert.equal(allowedLtdDifferenceAmount, params.allowedLtdDifferenceAmount);
    });

    it("only allowed should set params ", async function() {
        await testHelper.expectThrow(monetarySupervisor.setParams(10000, 10000, { from: accounts[1] }));
    });

    it("all params should be accessible via getParams", async function() {
        const paramsOneByOne = await Promise.all([
            monetarySupervisor.ltdDifferenceLimit(),
            monetarySupervisor.allowedLtdDifferenceAmount()
        ]);

        const paramsViaHelper = await monetarySupervisor.getParams();

        assert.deepEqual(paramsOneByOne, paramsViaHelper);
    });
});
