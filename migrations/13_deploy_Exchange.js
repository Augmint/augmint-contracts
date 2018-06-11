const Exchange = artifacts.require("./Exchange.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const Rates = artifacts.require("./Rates.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Exchange, accounts[0], TokenAEur.address, Rates.address);
};
