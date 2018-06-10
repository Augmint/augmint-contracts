const Rates = artifacts.require("./Rates.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Rates, accounts[0]);
};
