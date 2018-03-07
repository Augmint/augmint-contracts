var Rates = artifacts.require("./Rates.sol");
var SafeMath = artifacts.require("./SafeMath.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.link(SafeMath, Rates);
    await deployer.deploy(Rates);
    const rates = Rates.at(Rates.address);
    let grantTxs = [rates.grantPermission(accounts[0], "setRate")];

    if (web3.version.network == 4) {
        console.log("On rinkeby. Granting permissions to setRate for dev and ratesfeeder accounts.");
        grantTxs = grantTxs.concat([
            rates.grantPermission("0x8c58187a978979947b88824dcda5cb5fd4410387", "setRate"), // ratesfeeder account
            rates.grantPermission("0xd3D44BCf1F430edD91781AD5a231b999684c2feB", "setRate") // KP's account
        ]);
    }
    await Promise.all(grantTxs);

    await rates.setRate("EUR", 99800);
};
