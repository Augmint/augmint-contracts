const PreToken = artifacts.require("./PreToken.sol");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        deployer.deploy(PreToken, accounts[0]);
    });
};
