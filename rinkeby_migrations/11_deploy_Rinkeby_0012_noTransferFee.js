const Rinkeby_0012_noTransferFee = artifacts.require("./Rinkeby_0012_noTransferFee.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rinkeby_0012_noTransferFee);
    });
};
