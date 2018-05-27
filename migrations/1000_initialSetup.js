const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const Rates = artifacts.require("./Rates.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");

const localTest_initialSetup = artifacts.require("./SB_scripts/localTest/localTest_initialSetup.sol");

module.exports = function(deployer, network) {
    deployer
        .deploy(
            localTest_initialSetup,
            Rates.address,
            FeeAccount.address,
            AugmintReserves.address,
            InterestEarnedAccount.address,
            TokenAEur.address,
            MonetarySupervisor.address,
            LoanManager.address,
            Locker.address,
            Exchange.address
        )
        .then(async initialSetupScript => {
            // TODO: MonetaryBoard permissions , should be removed once Restricted is using multiSig
            const rates = Rates.at(Rates.address);
            await rates.grantPermission(StabilityBoardSigner.address, "MonetaryBoard");

            // run initial setup script
            const stabilityBoardSigner = StabilityBoardSigner.at(StabilityBoardSigner.address);
            await stabilityBoardSigner.sign(initialSetupScript.address);
            const tx = await stabilityBoardSigner.execute(initialSetupScript.address);

            if (!tx.logs[0].args.result) {
                throw new Error(`initialSetupScript execution failed.
                    Script address: ${initialSetupScript.address}
                    Execution hash: ${tx.receipt.transactionHash}\n`);
            }
        });
};
