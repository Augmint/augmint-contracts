const Rinkeby_0008_reviveTestProducts = artifacts.require("./Rinkeby_0008_reviveTestProducts.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rinkeby_0008_reviveTestProducts);
    });
};