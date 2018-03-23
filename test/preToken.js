const PreToken = artifacts.require("./PreToken.sol");
const testHelpers = require("./helpers/testHelpers.js");

let preToken;

contract("PreToken", () => {
    before(() => {
        preToken = PreToken.at(PreToken.address);
    });

    it("should add an agreement");
    it("should NOT add an agreement without agreementHash");
    it("only permitted should add an agreement");

    it("should issueTo an account with agreement");
    it("should NOT issueTo an account without an agreement");
    it("only permitted should issueTo");

    it("should transfer to an account wich has no agreement yet");
    it("should NOT transfer to an account which already has an agreement");
    it("should NOT transfer more than balance");
});
