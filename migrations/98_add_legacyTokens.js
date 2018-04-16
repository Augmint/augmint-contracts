const FeeAccount = artifacts.require("./FeeAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.then(async () => {
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        if (web3.version.network == 999) {
            const oldToken = await TokenAEur.new(
                FeeAccount.address,
                2000, // transferFeePt in parts per million = 0.2%
                2, // min: 0.02 A-EUR
                500 // max fee: 5 A-EUR
            );

            await Promise.all([
                oldToken.grantPermission(accounts[0], "MonetarySupervisorContract"), // "hack" for test to issue
                oldToken.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
                monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken.address, true)
            ]);

            await oldToken.issueTo(accounts[0], 20000); // issue some to account 0
            console.log(
                "On local ganache - deployed a mock legacy token contract for manual testing at " + oldToken.address
            );
        } else if (web3.version.network == 4) {
            const oldToken = TokenAEur.at("0xa35d9de06895a3a2e7ecae26654b88fe71c179ea");
            await Promise.all([
                oldToken.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
                monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken.address, true)
            ]);
        }
    });
};
