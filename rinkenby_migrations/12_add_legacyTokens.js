const FeeAccount = artifacts.require("./FeeAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

module.exports = async function(deployer, network) {
    deployer.then(async () => {
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const feeAccount = FeeAccount.at(FeeAccount.address);

        const oldToken1 = TokenAEur.at("0xa35d9de06895a3a2e7ecae26654b88fe71c179ea");
        const oldToken2 = TokenAEur.at("0x03fe291f8a30e54cd05459f368d554b40784ca78");
        await Promise.all([
            feeAccount.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
            monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken1.address, true),
            monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken2.address, true)
        ]);
    });
};
