const tokenAceTestHelper = new require("./helpers/tokenAceTestHelper.js");
const monetarySupervisorTestHelpers = require("./helpers/monetarySupervisorTestHelpers.js");
const testHelper = new require("./helpers/testHelper.js");

let tokenAce, monetarySupervisor, minFee, maxFee, feePt, minFeeAmount, maxFeeAmount;

contract("Transfer ACE tests", accounts => {
    before(async function() {
        tokenAce = await tokenAceTestHelper.newTokenAceMock();
        monetarySupervisor = await monetarySupervisorTestHelpers.newMonetarySupervisorMock(tokenAce);
        await monetarySupervisor.issueToReserve(1000000000);
        await Promise.all([
            monetarySupervisorTestHelpers.withdrawFromReserve(accounts[0], 500000000),
            monetarySupervisorTestHelpers.withdrawFromReserve(accounts[1], 500000000)
        ]);
        [feePt, minFee, maxFee] = await tokenAce.getParams();
        minFeeAmount = minFee.div(feePt).mul(1000000);
        maxFeeAmount = maxFee.div(feePt).mul(1000000);
    });

    it("Should be able to transfer ACE between accounts (without narrative, min fee)", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: minFeeAmount.sub(10),
            narrative: ""
        });
    });

    it("Should be able to transfer ACE between accounts (with narrative, max fee)", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: maxFeeAmount.add(10),
            narrative: "test narrative"
        });
    });

    it("transfer fee % should deducted when fee % is between min and max fee", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: maxFeeAmount.sub(10),
            narrative: ""
        });
    });

    it("Should be able to transfer 0 amount without narrative", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: 0,
            narrative: ""
        });
    });

    it("Should be able to transfer 0 with narrative", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[1],
            to: accounts[2],
            amount: 0,
            narrative: "test narrative"
        });
    });

    it("Shouldn't be able to transfer ACE when ACE balance is insufficient", async function() {
        await testHelper.expectThrow(
            tokenAce.transfer(accounts[2], (await tokenAce.balanceOf(accounts[1])).plus(1), {
                from: accounts[1]
            })
        );
    });

    it("Shouldn't be able to transfer ACE between the same accounts", async function() {
        await testHelper.expectThrow(
            tokenAce.transfer(accounts[1], 20000, {
                from: accounts[1]
            })
        );
    });

    it("Shouldn't be able to transfer to 0x0", async function() {
        await testHelper.expectThrow(
            tokenAce.transfer("0x0", 20000, {
                from: accounts[1]
            })
        );
    });

    it("should have zero fee if 'to' is NoFeeTransferContracts", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[0],
            to: accounts[1],
            amount: 10000,
            narrative: "",
            fee: 0
        });
    });

    it("should have zero fee if 'from' is NoFeeTransferContracts", async function() {
        await tokenAceTestHelper.transferTest(this, {
            from: accounts[0],
            to: accounts[1],
            amount: 10000,
            narrative: "transfer 0 test",
            fee: 0
        });
    });
});
