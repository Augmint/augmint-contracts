const TxDelegator = artifacts.require("./TxDelegator.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer) {
    deployer.deploy(TxDelegator);
    deployer.then(async () => {
        const feeAccount = FeeAccount.at(FeeAccount.address);
        await feeAccount.grantPermission(TxDelegator.address, "NoFeeTransferContracts");
    });
};
