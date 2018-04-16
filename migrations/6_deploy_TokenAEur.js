const SafeMath = artifacts.require("./SafeMath.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, TokenAEur);

    deployer.deploy(
        TokenAEur,
        FeeAccount.address,
        2000, // transferFeePt in parts per million = 0.2%
        2, // min: 0.02 A-EUR
        500 // max fee: 5 A-EUR
    );

    deployer.then(async () => {
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        await Promise.all([
            tokenAEur.grantPermission(FeeAccount.address, "NoFeeTransferContracts"),
            tokenAEur.grantPermission(AugmintReserves.address, "NoFeeTransferContracts")
        ]);
    });
};
