const PreTokenProxy = artifacts.require("./PreTokenProxy.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        deployer.deploy(PreTokenProxy);
    });
};
