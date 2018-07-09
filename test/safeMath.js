/* These tests are only for mul and add overflows.
sub, div, rounded div covered by other test cases
*/

const BigNumber = require("bignumber.js");
const Locker = artifacts.require("./Locker.sol");
const testHelpers = require("./helpers/testHelpers.js");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

let locker;
let monetarySupervisor;
const MAX_UINT256 = new BigNumber(2).pow(256).sub(1);

contract("SafeMath", () => {
    before(() => {
        locker = Locker.at(Locker.address);
        monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
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
});
