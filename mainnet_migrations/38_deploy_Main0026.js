const Main0026 = artifacts.require("./Main0026.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0026);
    });
};