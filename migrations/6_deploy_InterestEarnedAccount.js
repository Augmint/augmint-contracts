const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(InterestEarnedAccount);

    deployer.then(async () => {
        const feeAccount = FeeAccount.at(FeeAccount.address);
        await feeAccount.grantPermission(InterestEarnedAccount.address, "NoFeeTransferContracts");
    });
};
