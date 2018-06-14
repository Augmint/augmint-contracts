const LoanManager = artifacts.require("./LoanManager.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Rates = artifacts.require("./Rates.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(LoanManager, accounts[0], TokenAEur.address, MonetarySupervisor.address, Rates.address);
};
