/* init preToken and new contracts signed via
 Rink0001_initNewContracts.sol

NB: deployer account can sign these scripts b/c  initially the deployer is the sole signer.
    if migration succeed the following step will be to add new signers and remove deployer as signer
 */
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const Rink0001_initNewContracts = artifacts.require("./Rink0001_initNewContracts.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        const rink0001_initNewContracts = await deployer.deploy(Rink0001_initNewContracts);

        // run stabilityboard setup scripts. deployer is the only signer yet
        // (it's fine, these are new deployments, a script later will add signers and remove deployer)
        const stabilityBoardSigner = StabilityBoardSigner.at("0xe733ddE64ce5b9930DFf8F97E5615635fd4095fB");
        await stabilityBoardSigner.sign(rink0001_initNewContracts.address);
        const tx = await stabilityBoardSigner.execute(rink0001_initNewContracts.address);

        if (!tx.logs[0].args.result) {
            throw new Error(`rink0001_initNewContracts execution failed.
                Script address: ${rink0001_initNewContracts.address}
                Execution hash: ${tx.receipt.transactionHash}\n`);
        }

        console.log(" Done with migration step 20. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(20);
    });
};
