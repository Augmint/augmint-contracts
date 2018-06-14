/* add  preToken and StabilityBoard Signers and remove deployer account as signer
    Executes Main0002_setupPreTokenSigners.sol & Main0003_setupSBSigners scripts
*/
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const PreTokenProxy = artifacts.require("./PreTokenProxy.sol");
const Main0002_setupPreTokenSigners = artifacts.require("./Main0002_setupPreTokenSigners.sol");
const Main0003_setupSBSigners = artifacts.require("./Main0003_setupSBSigners.sol");

/* workaround for
    Error encountered, bailing. Network state unknown. Review successful transactions manually.
    nonce too low
caused by Infura's loadbalancers getting the nonce of account with a delay after a new tx sent */
function waitForInfuraNonce(durationInMs = 20000) {
    console.log(" Waiting ", durationInMs / 1000, " secs for infura loadbalancers to update with new tx nonce");
    return new Promise(resolve => setTimeout(resolve, durationInMs));
}

module.exports = function(deployer) {
    deployer.then(async () => {
        const main0002_setupPreTokenSigners = await deployer.deploy(Main0002_setupPreTokenSigners);
        await waitForInfuraNonce();

        const main0003_setupSBSigners = await deployer.deploy(Main0003_setupSBSigners);
        await waitForInfuraNonce();

        const preTokenProxy = PreTokenProxy.at("0x1411b3B189B01f6e6d1eA883bFFcbD3a5224934C");
        const stabilityBoardProxy = StabilityBoardProxy.at("0x4686f017D456331ed2C1de66e134D8d05B24413D");

        console.log("Signing Main0002_setupPreTokenSigners deployed at ", main0002_setupPreTokenSigners.address);
        await preTokenProxy.sign(main0002_setupPreTokenSigners.address);
        await waitForInfuraNonce();

        console.log("Signing Main0003_setupSBSigners deployed at ", main0003_setupSBSigners.address);
        await stabilityBoardProxy.sign(main0003_setupSBSigners.address);
        await waitForInfuraNonce();

        console.log("Executing Main0002_setupPreTokenSigners deployed at ", main0002_setupPreTokenSigners.address);
        const tx1 = await preTokenProxy.execute(main0002_setupPreTokenSigners.address);
        if (!tx1.logs[3].args.result) {
            console.log("logs[0]:", tx1.logs[3]);
            throw new Error(`main0002_setupPreTokenSigners execution failed.
                Script address: ${main0002_setupPreTokenSigners.address}
                Execution hash: ${tx1.receipt.transactionHash}\n`);
        }
        await waitForInfuraNonce();

        console.log("Executing Main0003_setupSBSigners deployed at ", main0003_setupSBSigners.address);
        const tx2 = await stabilityBoardProxy.execute(main0003_setupSBSigners.address);
        if (!tx2.logs[4].args.result) {
            throw new Error(`main0003_setupSBSigners execution failed.
                Script address: ${main0003_setupSBSigners.address}
                Execution hash: ${tx2.receipt.transactionHash}\n`);
        }
        await waitForInfuraNonce();

        console.log(" Done with migration step 15. Updating truffle Migrations step manually");
        await Migrations.at("0xE7E9f87805C0BEC5108963D07f85e4cA5892D421").setCompleted(15);
    });
};
