const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Rates = artifacts.require("./Rates.sol");
const LoanManager = artifacts.require("./LoanManager.sol");

module.exports = function(deployer) {
    deployer.deploy(LoanManager, TokenAEur.address, MonetarySupervisor.address, Rates.address);
};
