const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer) {
    deployer.deploy(AugmintReserves);

    deployer.then(async () => {
        const feeAccount = FeeAccount.at(FeeAccount.address);
        await feeAccount.grantPermission(AugmintReserves.address, "NoFeeTransferContracts");
    });
};
