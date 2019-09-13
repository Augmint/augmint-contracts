const Main0030_setup_loanmanager_products = artifacts.require("./Main0030_setup_loanmanager_products.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0030_setup_loanmanager_products);
    });
};