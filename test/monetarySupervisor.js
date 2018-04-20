const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const testHelpers = require("./helpers/testHelpers.js");

let augmintToken = null;
let monetarySupervisor = null;
let augmintReserves = null;

contract("MonetarySupervisor tests", accounts => {
    before(async () => {
        augmintToken = tokenTestHelpers.augmintToken;
        monetarySupervisor = tokenTestHelpers.monetarySupervisor;
        augmintReserves = tokenTestHelpers.augmintReserves;
    });

    it("should be possible to issue new tokens to reserve", async function() {
        const amount = 100000;
        const [totalSupplyBefore, reserveBalBefore, issuedByMonetaryBoardBefore] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(augmintReserves.address),
            monetarySupervisor.issuedByMonetaryBoard()
        ]);

        const tx = await monetarySupervisor.issueToReserve(amount);
        testHelpers.logGasUse(this, tx, "issue");

        await testHelpers.assertEvent(augmintToken, "Transfer", {
            from: testHelpers.NULL_ACC,
            to: augmintReserves.address,
            amount: amount
        });

        const [totalSupply, issuedByMonetaryBoard, reserveBal] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(augmintReserves.address),
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
        await testHelpers.expectThrow(monetarySupervisor.issueToReserve(1000, { from: accounts[1] }));
    });

    it("should be possible to burn tokens from reserve", async function() {
        const amount = 9000000;
        await monetarySupervisor.issueToReserve(amount);
        const [totalSupplyBefore, reserveBalBefore, issuedByMonetaryBoardBefore] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(augmintReserves.address),
            monetarySupervisor.issuedByMonetaryBoard()
        ]);

        const tx = await monetarySupervisor.burnFromReserve(amount, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "burnFromReserve");

        await testHelpers.assertEvent(augmintToken, "Transfer", {
            from: augmintReserves.address,
            to: testHelpers.NULL_ACC,
            amount: amount
        });

        const [totalSupply, issuedByMonetaryBoard, reserveBal] = await Promise.all([
            augmintToken.totalSupply(),
            augmintToken.balanceOf(augmintReserves.address),
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
        await testHelpers.expectThrow(monetarySupervisor.burnFromReserve(1000, { from: accounts[1] }));
    });

    it("should be possible to set parameters", async function() {
        const params = {
            lockDifferenceLimit: 12345,
            loanDifferenceLimit: 54321,
            allowedDifferenceAmount: 1234
        };
        const tx = await monetarySupervisor.setLtdParams(
            params.lockDifferenceLimit,
            params.loanDifferenceLimit,
            params.allowedDifferenceAmount,
            {
                from: accounts[0]
            }
        );
        testHelpers.logGasUse(this, tx, "setLtdParams");

        await testHelpers.assertEvent(monetarySupervisor, "LtdParamsChanged", {
            lockDifferenceLimit: params.lockDifferenceLimit,
            loanDifferenceLimit: params.loanDifferenceLimit,
            allowedDifferenceAmount: params.allowedDifferenceAmount
        });

        const [
            lockDifferenceLimit,
            loanDifferenceLimit,
            allowedDifferenceAmount
        ] = await monetarySupervisor.ltdParams();

        assert.equal(lockDifferenceLimit, params.lockDifferenceLimit);
        assert.equal(loanDifferenceLimit, params.loanDifferenceLimit);
        assert.equal(allowedDifferenceAmount, params.allowedDifferenceAmount);
    });

    it("only allowed should set ltd params ", async function() {
        await testHelpers.expectThrow(monetarySupervisor.setLtdParams(10000, 10000, 10000, { from: accounts[1] }));
    });

    it("should adjust KPIs", async function() {
        const [totalLoanAmountBefore, totalLockedAmountBefore] = await Promise.all([
            monetarySupervisor.totalLoanAmount(),
            monetarySupervisor.totalLockedAmount()
        ]);
        const tx = await monetarySupervisor.adjustKPIs(10, 20, { from: accounts[0] });
        testHelpers.logGasUse(this, tx, "adjustKPIs");

        const [totalLoanAmountAfter, totalLockedAmountAfter] = await Promise.all([
            monetarySupervisor.totalLoanAmount(),
            monetarySupervisor.totalLockedAmount(),
            testHelpers.assertEvent(monetarySupervisor, "KPIsAdjusted", {
                totalLoanAmountAdjustment: 10,
                totalLockedAmountAdjustment: 20
            })
        ]);

        assert.equal(totalLoanAmountAfter.toNumber(), totalLockedAmountBefore.add(10));
        assert.equal(totalLockedAmountAfter.toNumber(), totalLoanAmountBefore.add(20));
    });

    it("only allowed should adjust KPIs", async function() {
        await testHelpers.expectThrow(monetarySupervisor.adjustKPIs(10, 10, { from: accounts[1] }));
    });

    it("should change interestEarnedAccount and augmintReserves", async function() {
        const newInterestEarnedAccount = accounts[2];
        const newAugmintReserves = accounts[3];
        const tx = await monetarySupervisor.setSystemContracts(newInterestEarnedAccount, newAugmintReserves);
        testHelpers.logGasUse(this, tx, "setSystemContracts");

        const [actualInterestEarnedContract, actualAugmintReserves] = await Promise.all([
            monetarySupervisor.interestEarnedAccount(),
            monetarySupervisor.augmintReserves(),
            testHelpers.assertEvent(monetarySupervisor, "SystemContractsChanged", {
                newInterestEarnedAccount,
                newAugmintReserves
            })
        ]);

        assert.equal(actualInterestEarnedContract, newInterestEarnedAccount);
        assert.equal(actualAugmintReserves, newAugmintReserves);
    });

    it("only allowed should change interestEarnedAccount and augmintReserves", async function() {
        const newInterestEarnedAccount = tokenTestHelpers.interestEarnedAccount.address;
        const newAugmintReserves = augmintReserves.address;
        await testHelpers.expectThrow(
            monetarySupervisor.setSystemContracts(newInterestEarnedAccount, newAugmintReserves, { from: accounts[1] })
        );
    });
});
