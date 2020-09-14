/* deploy new (margin) LoanManager contract  */
const LoanManager = artifacts.require("./LoanManager.sol");

const STABILITYBOARD_PROXY_ADDRESS = "0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84";
const TOKENAEUR_ADDRESS = "0xc994a2dEb02543Db1f48688438b9903c4b305ce3";
const MONETARY_SUPERVISOR_ADDRESS = "0x27484AFe9e6c332fB07F21Fac82d442EBe1D22c3";
const RATES_ADDRESS = "0x4272dB2EB82068E898588C3D6e4B5D55c3848793";

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(LoanManager, STABILITYBOARD_PROXY_ADDRESS, TOKENAEUR_ADDRESS, MONETARY_SUPERVISOR_ADDRESS, RATES_ADDRESS);
    });
};