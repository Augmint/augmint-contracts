const Rinkeby_0011_setupSbProxySigners = artifacts.require("./Rinkeby_0011_setupSbProxySigners.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rinkeby_0011_setupSbProxySigners);
    });
};