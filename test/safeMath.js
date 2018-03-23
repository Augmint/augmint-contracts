/* These tests are only for mul and add overflows.
sub, div, rounded div covered by other test cases */

const SafeMath = artifacts.require("./SafeMath.sol");
const testHelpers = require("./helpers/testHelpers.js");

let safeMath;

contract("SafeMath", () => {
    before(() => {
        safeMath = SafeMath.at(SafeMath.address);
    });

    it("should throw if mul overflows", async function() {
        testHelpers.expectThrow(safeMath.mul(10, 10));
    });

    it("should throw if add overflows", async function() {
        testHelpers.expectThrow(safeMath.add(10, 10));
    });
});
