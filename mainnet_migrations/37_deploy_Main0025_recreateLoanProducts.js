const Main0025_recreateLoanProducts = artifacts.require("./Main0025_recreateLoanProducts.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0025_recreateLoanProducts);
    });
};