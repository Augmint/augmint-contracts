/* fix issues by

NB: deployer account can sign these scripts b/c no multisig in these contracts
 */
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const Rink0003_setupSigners = artifacts.require("./Rink0003_setupSigners.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        const rink0003_setupSigners = await deployer.deploy(Rink0003_setupSigners);
        const stabilityBoardSigner = StabilityBoardSigner.at("0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB");
        await stabilityBoardSigner.sign(rink0003_setupSigners.address);

        await stabilityBoardSigner.execute(rink0003_setupSigners.address);

        console.log(" Done with migration step 22. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(22);
    });
};
