const FeeAccount = artifacts.require("./FeeAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.then(async () => {
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const feeAccount = FeeAccount.at(FeeAccount.address);
        if (web3.version.network == 999) {
            const oldToken = await TokenAEur.new(FeeAccount.address);

            await Promise.all([
                oldToken.grantPermission(accounts[0], "MonetarySupervisorContract"), // "hack" for test to issue
                feeAccount.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
                monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken.address, true)
            ]);

            await oldToken.issueTo(accounts[0], 20000); // issue some to account 0
            console.log(
                "On local ganache - deployed a mock legacy token contract for manual testing at " + oldToken.address
            );
        } else if (web3.version.network == 4) {
            const oldToken1 = TokenAEur.at("0xa35d9de06895a3a2e7ecae26654b88fe71c179ea");
            const oldToken2 = TokenAEur.at("0x95aa79d7410eb60f49bfd570b445836d402bd7b1");
            // latest TokenAEur deployed at 0x135893F1A6B3037BB45182841f18F69327366992
            await Promise.all([
                feeAccount.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
                monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken1.address, true),
                monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken2.address, true),
                oldToken1.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
                oldToken2.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts")
            ]);
        }
    });
};
