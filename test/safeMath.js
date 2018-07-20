/* These tests are only for mul and add overflows.
sub, div, rounded div covered by other test cases
*/

const BigNumber = require("bignumber.js");
const Locker = artifacts.require("./Locker.sol");
const testHelpers = require("./helpers/testHelpers.js");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const SafeMathTester = artifacts.require("./test/SafeMathTester.sol");

let locker;
let monetarySupervisor;
let safeMathTester;
const MAX_UINT256 = new BigNumber(2).pow(256).sub(1);

contract("SafeMath", () => {
    before(() => {
        locker = Locker.at(Locker.address);
        monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        safeMathTester = SafeMathTester.at(SafeMathTester.address);
    });

    it("should throw if mul overflows", async function() {
        await testHelpers.expectThrow(
            locker.calculateInterest(
                2,
                MAX_UINT256.add(1)
                    .div(2)
                    .round(0, BigNumber.ROUND_UP)
            )
        );
    });

    it("should throw if add overflows", async function() {
        await monetarySupervisor.issueToReserve(1);
        await testHelpers.expectThrow(monetarySupervisor.issueToReserve(MAX_UINT256.toString()));
    });

    it("should round up if not exactly divisible", async function() {
        assert.equal(Number(await locker.calculateInterest(1000, 1000)), 1);
        assert.equal(Number(await locker.calculateInterest(1, 1000000)), 1);
        assert.equal(Number(await locker.calculateInterest(1000, 1001)), 2);
        assert.equal(Number(await locker.calculateInterest(1, 1000001)), 2);

        assert.equal(Number(await locker.calculateInterest(1918, 10000)), 20);
        assert.equal(Number(await locker.calculateInterest(3836, 10000)), 39);
        assert.equal(Number(await locker.calculateInterest(8220, 10000)), 83);
        assert.equal(Number(await locker.calculateInterest(17261, 10000)), 173);
        assert.equal(Number(await locker.calculateInterest(27124, 10000)), 272);
        assert.equal(Number(await locker.calculateInterest(56713, 10000)), 568);
        assert.equal(Number(await locker.calculateInterest(120000, 10000)), 1200);
    });

    it("should round properly when using roundedDiv", async function() {
        assert.equal(Number(await safeMathTester.roundedDiv(0, 2)), 0);
        assert.equal(Number(await safeMathTester.roundedDiv(1, 2)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(2, 2)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(3, 2)), 2);

        assert.equal(Number(await safeMathTester.roundedDiv(0, 3)), 0);
        assert.equal(Number(await safeMathTester.roundedDiv(1, 3)), 0);
        assert.equal(Number(await safeMathTester.roundedDiv(2, 3)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(3, 3)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(4, 3)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(5, 3)), 2);

        assert.equal(Number(await safeMathTester.roundedDiv(0, 4)), 0);
        assert.equal(Number(await safeMathTester.roundedDiv(1, 4)), 0);
        assert.equal(Number(await safeMathTester.roundedDiv(2, 4)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(3, 4)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(4, 4)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(5, 4)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(6, 4)), 2);

        assert.equal(Number(await safeMathTester.roundedDiv(MAX_UINT256, 1)), MAX_UINT256);
        assert.equal(Number(await safeMathTester.roundedDiv(MAX_UINT256, MAX_UINT256)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(MAX_UINT256.sub(1), MAX_UINT256)), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(MAX_UINT256, MAX_UINT256.sub(1))), 1);
        assert.equal(Number(await safeMathTester.roundedDiv(MAX_UINT256, MAX_UINT256.div(2))), 2);
        assert.equal(Number(await safeMathTester.roundedDiv(MAX_UINT256, MAX_UINT256.div(3))), 3);
    });

    it("should not divide by zero", async function() {
        await testHelpers.expectThrow(safeMathTester.roundedDiv(0, 0));
        await testHelpers.expectThrow(safeMathTester.roundedDiv(1, 0));
        await testHelpers.expectThrow(safeMathTester.roundedDiv(MAX_UINT256, 0));

        await testHelpers.expectThrow(safeMathTester.ceilDiv(0, 0));
        await testHelpers.expectThrow(safeMathTester.ceilDiv(1, 0));
        await testHelpers.expectThrow(safeMathTester.ceilDiv(MAX_UINT256, 0));
    });
});
