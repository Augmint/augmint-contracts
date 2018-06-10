/* init preToken and new contracts signed via
 Rink0001_initNewContracts.sol

NB: deployer account can sign these scripts b/c  initially the deployer is the sole signer.
    if migration succeed the following step will be to add new signers and remove deployer as signer
 */
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const Rink0001_initNewContracts = artifacts.require("./Rink0001_initNewContracts.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        const rink0001_initNewContracts = await deployer.deploy(Rink0001_initNewContracts);
        // new MS & feeAccount
        const MONETARYSUPERVISOR_ADDRESS = "0x01844c9bade08A8ffdB09aD9f1fecE2C83a6E6a8";

        // oldToken3 & oldToken4 both using this feeAccount
        const oldFeeAccount1 = FeeAccount.at("0xc26667132b0b798ab87864f7c29c0819c887aadb");

        // run stabilityboard setup scripts. deployer is the only signer yet
        // (it's fine, these are new deployments, a script later will add signers and remove deployer)
        const stabilityBoardProxy = StabilityBoardProxy.at("0x44022C28766652EC5901790E53CEd7A79a19c10A");
        await Promise.all([
            stabilityBoardProxy.sign(rink0001_initNewContracts.address),

            /*  to be able to convert old tokens. As oldFeeAccount1 was permissioned without multiSig,
                it can be executed by deployer account.
                NB:
                1. This step need to be executed via an authorised StabilityBoardProxy script in the future
                    (as new deploys are w/ MultiSig)
                2. !!!! On newer FeeAccounts the permission is renamed to NoTransferFee !!!!*/
            oldFeeAccount1.grantPermission(MONETARYSUPERVISOR_ADDRESS, "NoFeeTransferContracts")
        ]);

        const tx = await stabilityBoardProxy.execute(rink0001_initNewContracts.address);

        if (!tx.logs[0].args.result) {
            throw new Error(`rink0001_initNewContracts execution failed.
                Script address: ${rink0001_initNewContracts.address}
                Execution hash: ${tx.receipt.transactionHash}\n`);
        }

        console.log(" Done with migration step 20. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(20);
    });
};
