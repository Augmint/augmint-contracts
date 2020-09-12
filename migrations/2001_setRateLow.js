// sets the current rate to a low value (for testing margin loans)
// run it with: "truffle migrate -f 2001 --to 2001" or "setrate:low"

const Rates = artifacts.require("./Rates.sol");
const newRate = "42500";

module.exports = function (deployer) {
    deployer.then(async () => {
        const rates = await Rates.at(Rates.address);
        await rates.setRate(web3.utils.asciiToHex("EUR"), newRate);
    });
};
