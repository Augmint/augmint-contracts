const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const testHelper = require("./helpers/testHelper.js");

const NULL_ACC = "0x0000000000000000000000000000000000000000";
let tokenAce;

contract("TokenAce tests", accounts => {
    before(async () => {
        tokenAce = await tokenAceTestHelper.newTokenAceMock();
    });

    it("should be possible to issue new tokens to reserve", async function() {
        const amount = 100000;
        const [totalSupplyBefore, reserveBalBefore, issuedByMonetaryBoardBefore] = await Promise.all([
            tokenAce.totalSupply(),
            tokenAce.balanceOf(tokenAce.address),
            tokenAce.issuedByMonetaryBoard()
        ]);

        const tx = await tokenAce.issue(amount);
        testHelper.logGasUse(this, tx, "issue");

        await testHelper.assertEvent(tokenAce, "Transfer", {
            from: NULL_ACC,
            to: tokenAce.address,
            amount: amount
        });

        const [totalSupply, issuedByMonetaryBoard, reserveBal] = await Promise.all([
            tokenAce.totalSupply(),
            tokenAce.balanceOf(tokenAce.address),
            tokenAce.issuedByMonetaryBoard()
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
        await testHelper.expectThrow(tokenAce.issue(1000, { from: accounts[1] }));
    });

    it("should be possible to burn tokens from reserve", async function() {
        const amount = 900;
        await tokenAce.issue(amount);
        const [totalSupplyBefore, reserveBalBefore, issuedByMonetaryBoardBefore] = await Promise.all([
            tokenAce.totalSupply(),
            tokenAce.balanceOf(tokenAce.address),
            tokenAce.issuedByMonetaryBoard()
        ]);

        const tx = await tokenAce.burn(amount);
        testHelper.logGasUse(this, tx, "burn");

        await testHelper.assertEvent(tokenAce, "Transfer", {
            from: tokenAce.address,
            to: NULL_ACC,
            amount: amount
        });

        const [totalSupply, issuedByMonetaryBoard, reserveBal] = await Promise.all([
            tokenAce.totalSupply(),
            tokenAce.balanceOf(tokenAce.address),
            tokenAce.issuedByMonetaryBoard()
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
        await tokenAce.issue(2000);
        await testHelper.expectThrow(tokenAce.burn(1000, { from: accounts[1] }));
    });

    it("should be possible to set transfer fees ", async function() {
        const fee = { pt: 100000, max: 80, min: 90 };
        const tx = await tokenAce.setTransferFees(fee.pt, fee.min, fee.max, { from: accounts[0] });
        testHelper.logGasUse(this, tx, "setTransferFees");

        const [feePt, feeMin, feeMax] = await Promise.all([
            tokenAce.transferFeePt(),
            tokenAce.transferFeeMin(),
            tokenAce.transferFeeMax()
        ]);

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
});
