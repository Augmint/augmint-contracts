/* Deploy new locker contract with lock interest roundup fix:
https://github.com/Augmint/augmint-contracts/pull/121
*/
const Locker = artifacts.require("./Locker.sol");
const Migrations = artifacts.require("./Migrations.sol");

const STABILITYBOARDPROXY_ADDRESS = "0x4686f017D456331ed2C1de66e134D8d05B24413D";
const TOKENAEUR_ADDRESS = "0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0";
const MONETARYSUPERVISOR_ADDRESS = "0x1Ca4F9d261707aF8A856020a4909B777da218868";

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
        await deployer.deploy(Locker, STABILITYBOARDPROXY_ADDRESS, TOKENAEUR_ADDRESS, MONETARYSUPERVISOR_ADDRESS);

        await waitForInfuraNonce();

        console.log(" Done with migration step 18. Updating truffle Migrations step manually");
        await Migrations.at("0xE7E9f87805C0BEC5108963D07f85e4cA5892D421").setCompleted(18);
    });
};
