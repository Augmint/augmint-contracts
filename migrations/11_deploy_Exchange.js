const TokenAEur = artifacts.require("./TokenAEur.sol");
const Exchange = artifacts.require("./Exchange.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer) {
    deployer.deploy(Exchange, TokenAEur.address);
    deployer.then(async () => {
        const feeAccount = FeeAccount.at(FeeAccount.address);
        await feeAccount.grantPermission(Exchange.address, "NoFeeTransferContracts");
    });
};
