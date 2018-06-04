const PreToken = artifacts.require("./PreToken.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(PreToken, accounts[0]);
};
