/* fix issues by

NB: deployer account can sign these scripts b/c no multisig in these contracts
 */
const Migrations = artifacts.require("./Migrations.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const Rink0002_fixInitNewContracts = artifacts.require("./Rink0002_fixInitNewContracts.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        // new MS & feeAccount
        const MONETARYSUPERVISOR_ADDRESS = "0xa14e0c0e39f00ef051DF516F80E76208B716b0eB";

        // oldToken3 & oldToken4 both using this feeAccount
        const oldFeeAccount1 = FeeAccount.at("0xc26667132b0b798ab87864f7c29c0819c887aadb");

        const rink0002_fixInitNewContracts = await deployer.deploy(Rink0002_fixInitNewContracts);
        const stabilityBoardSigner = StabilityBoardSigner.at("0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB");
        await stabilityBoardSigner.sign(rink0002_fixInitNewContracts.address);

        await Promise.all([
            /*  to be able to convert old tokens. As oldFeeAccount1 was permissioned without multiSig,
            it can be executed by deployer account. This step need to be executed via an authorised
            StabilityBoardSigner in the future (new deploys are w/ MultiSig) */
            oldFeeAccount1.grantPermission(MONETARYSUPERVISOR_ADDRESS, "NoFeeTransferContracts"),

            // execute fix script
            stabilityBoardSigner.execute(rink0002_fixInitNewContracts.address)
        ]);

        console.log(" Done with migration step 21. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(21);
    });
};
