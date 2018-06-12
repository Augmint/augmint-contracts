/* init preToken and new contracts signed via
 Rink0001_initNewContracts.sol

NB: deployer account can sign these scripts b/c  initially the deployer is the sole signer.
    if migration succeed the following step will be to add new signers and remove deployer as signer
 */
const Migrations = artifacts.require("./Migrations.sol");
const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const Main0001_initFirstDeploy = artifacts.require("./Main0001_initFirstDeploy.sol");

const PreToken = artifacts.require("./PreToken.sol");
const Rates = artifacts.require("./Rates.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");

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
        const SBP_ADDR = "0x4686f017D456331ed2C1de66e134D8d05B24413D";

        /* grant PermissionGranter to StabilityBoardProxy contract on all contracts
            NB: migration scripts mistekanly gave it to deployer account instead of StabilityBoardProxy in constructor)
                Main001 script will revoke PermissionGranter from deployer account */

        PreToken.at("0xeCb782B19Be6E657ae2D88831dD98145A00D32D5").grantPermission(SBP_ADDR, "PermissionGranter"),
        await waitForInfuraNonce();

        await Rates.at("0x4babbe57453e2b6AF125B4e304256fCBDf744480").grantPermission(SBP_ADDR, "PermissionGranter");
        await waitForInfuraNonce();

        await FeeAccount.at("0xF6B541E1B5e001DCc11827C1A16232759aeA730a").grantPermission(
            SBP_ADDR,
            "PermissionGranter"
        );
        await waitForInfuraNonce();

        await AugmintReserves.at("0x633cb544b2EF1bd9269B2111fD2B66fC05cd3477").grantPermission(
            SBP_ADDR,
            "PermissionGranter"
        );
        await waitForInfuraNonce();

        await InterestEarnedAccount.at("0x5C1a44E07541203474D92BDD03f803ea74f6947c").grantPermission(
            SBP_ADDR,
            "PermissionGranter"
        );
        await waitForInfuraNonce();

        await TokenAEur.at("0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0").grantPermission(SBP_ADDR, "PermissionGranter");
        await waitForInfuraNonce();

        await MonetarySupervisor.at("0x1Ca4F9d261707aF8A856020a4909B777da218868").grantPermission(
            SBP_ADDR,
            "PermissionGranter"
        );
        await waitForInfuraNonce();

        await LoanManager.at("0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070").grantPermission(
            SBP_ADDR,
            "PermissionGranter"
        );
        await waitForInfuraNonce();

        await Locker.at("0x095c0F071Fd75875a6b5a1dEf3f3a993F591080c").grantPermission(SBP_ADDR, "PermissionGranter");
        await waitForInfuraNonce();

        await Exchange.at("0x8b52b019d237d0bbe8Baedf219132D5254e0690b").grantPermission(SBP_ADDR, "PermissionGranter");
        await waitForInfuraNonce();

        /* Run stabilityboard setup script. deployer is the only signer yet
          (it's fine, this is new deployment, a script later will add signers and remove deployer) */
        console.log("Deploy:");
        const stabilityBoardProxy = StabilityBoardProxy.at(SBP_ADDR);
        const main0001_initFirstDeploy = await deployer.deploy(Main0001_initFirstDeploy);
        await waitForInfuraNonce();

        console.log("Sign:");
        await stabilityBoardProxy.sign(main0001_initFirstDeploy.address);
        await waitForInfuraNonce();

        console.log("Execute:");
        const tx = await stabilityBoardProxy.execute(main0001_initFirstDeploy.address);

        if (!tx.logs[0].args.result) {
            throw new Error(`rink0001_initNewContracts execution failed.
                Script address: ${main0001_initFirstDeploy.address}
                Execution hash: ${tx.receipt.transactionHash}\n`);
        }
        await waitForInfuraNonce();

        console.log(" Done with migration step 14. Updating truffle Migrations step manually");
        await Migrations.at("0xE7E9f87805C0BEC5108963D07f85e4cA5892D421").setCompleted(14);
    });
};
