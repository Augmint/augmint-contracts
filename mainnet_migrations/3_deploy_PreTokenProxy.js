const PreTokenProxy = artifacts.require("./PreTokenProxy.sol");

module.exports = function(deployer) {
    deployer.deploy(PreTokenProxy);
};
