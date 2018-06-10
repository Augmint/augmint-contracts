/* add  preToken and StabilityBoard Signers and remove deployer account as signer
    Executes Rink0002_setupPreTokenSigners.sol Rink0003_setupSBSigners scripts
*/
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const PreTokenProxy = artifacts.require("./PreTokenProxy.sol");
const Rink0002_setupPreTokenSigners = artifacts.require("./Rink0002_setupPreTokenSigners.sol");
const Rink0003_setupSBSigners = artifacts.require("./Rink0003_setupSBSigners.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        const [rink0002_setupPreTokenSigners, rink0003_setupSBSigners] = await Promise.all([
            deployer.deploy(Rink0002_setupPreTokenSigners),
            deployer.deploy(Rink0003_setupSBSigners)
        ]);

        const preTokenProxy = PreTokenProxy.at("0x0775465245e523b45Cc3b41477d44F908e22feDE");
        const stabilityBoardProxy = StabilityBoardProxy.at("0x44022C28766652EC5901790E53CEd7A79a19c10A");

        await Promise.all([
            preTokenProxy.sign(rink0002_setupPreTokenSigners.address),
            stabilityBoardProxy.sign(rink0003_setupSBSigners.address)
        ]);

        await Promise.all([
            preTokenProxy.execute(rink0002_setupPreTokenSigners.address),
            stabilityBoardProxy.execute(rink0003_setupSBSigners.address)
        ]);

        console.log(" Done with migration step 21. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(21);
    });
};
