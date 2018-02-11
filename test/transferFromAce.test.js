const tokenAceTestHelper = new require("./helpers/tokenAceTestHelper.js");
const testHelper = new require("./helpers/testHelper.js");
let tokenAce, maxFee;

contract("TransferFrom ACE tests", accounts => {
    before(async function() {
        tokenAce = await tokenAceTestHelper.newTokenAceMock();
        await tokenAce.issue(1000000000);
        await tokenAce.withdrawTokens(accounts[0], 500000000);
        await tokenAce.withdrawTokens(accounts[1], 500000000);
        maxFee = await tokenAce.transferFeeMax();
    });

    it("transferFrom", async function() {
        let expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 100000
        };

        await tokenAceTestHelper.approveTest(this, expApprove);

        await tokenAceTestHelper.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            amount: Math.round(expApprove.value / 2)
        });

        await tokenAceTestHelper.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            amount: Math.round(expApprove.value / 2),
            narrative: "Test with narrative"
        });
    });

    it("transferFrom spender to send to different to than itself", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 200000
        };

        await tokenAceTestHelper.approveTest(this, expApprove);

        await tokenAceTestHelper.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            to: accounts[2],
            amount: Math.round(expApprove.value / 2),
            narrative: "Test with narrative"
        });
    });

    it("Shouldn't approve 0x0 spender", async function() {
        await testHelper.expectThrow(
            tokenAce.approve("0x0", 100, {
                from: accounts[2]
            })
        );
    });

    it("transferFrom only if approved", async function() {
        await testHelper.expectThrow(
            tokenAce.transferFrom(accounts[0], accounts[2], 100, {
                from: accounts[2]
            })
        );
    });

    it("should transferFrom 0 amount when some approved", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 100000
        };

        await tokenAceTestHelper.approveTest(this, expApprove);
        await tokenAceTestHelper.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            amount: 0,
            narrative: "Test with narrative"
        });
    });

    it("shouldn't transferFrom even 0 amount when not approved", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 0
        };

        await tokenAceTestHelper.approveTest(this, expApprove);
        await testHelper.expectThrow(
            tokenAce.transferFrom(expApprove.owner, expApprove.spender, 0, {
                from: expApprove.spender
            })
        );
    });

    it("shouldn't transferFrom to 0x0", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 10000
        };

        await tokenAceTestHelper.approveTest(this, expApprove);
        await testHelper.expectThrow(
            tokenAce.transferFrom(expApprove.owner, "0x0", 0, {
                from: expApprove.spender
            })
        );
    });

    it("transferFrom only if approved is greater than amount", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: 200000
        };

        await tokenAceTestHelper.approveTest(this, expApprove);
        await testHelper.expectThrow(
            tokenAce.transferFrom(expApprove.owner, expApprove.spender, expApprove.value + 1, {
                from: expApprove.spender
            })
        );
    });

    it("transferFrom only if balance is enough", async function() {
        await tokenAce.transfer(accounts[1], maxFee, { from: accounts[0] }); // to cover the transfer fee
        const amount = await tokenAce.balanceOf(accounts[0]);
        const expApprove = {
            owner: accounts[1],
            spender: accounts[2],
            value: amount
        };
        await tokenAceTestHelper.approveTest(this, expApprove);

        await testHelper.expectThrow(
            tokenAce.transferFrom(expApprove.owner, expApprove.spender, expApprove.value + 1, {
                from: expApprove.spender
            })
        );
    });

    it("should have zero fee for transferFrom if 'to' is NoFeeTransferContracts", async function() {
        const expApprove = {
            owner: accounts[1],
            spender: accounts[0],
            to: accounts[0],
            value: 100000
        };
        await tokenAceTestHelper.approveTest(this, expApprove);

        await tokenAceTestHelper.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            to: expApprove.to,
            amount: expApprove.value,
            fee: 0
        });
    });

    it("should have zero fee for transferFrom if 'from' is NoFeeTransferContracts ", async function() {
        const expApprove = {
            owner: accounts[0],
            spender: accounts[1],
            to: accounts[2],
            value: 100000
        };
        await tokenAceTestHelper.approveTest(this, expApprove);

        await tokenAceTestHelper.transferFromTest(this, {
            from: expApprove.owner,
            spender: expApprove.spender,
            to: expApprove.to,
            amount: expApprove.value,
            fee: 0
        });
    });

    it("increaseApproval");
    it("decreaseApproval");
});
