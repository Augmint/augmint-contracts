const PreToken = artifacts.require("./PreToken.sol");

module.exports = function(deployer) {
    deployer.deploy(PreToken);
};
