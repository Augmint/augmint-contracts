const Main0024_disableOneYearProducts = artifacts.require("./Main0024_disableOneYearProducts.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0024_disableOneYearProducts);
    });
};