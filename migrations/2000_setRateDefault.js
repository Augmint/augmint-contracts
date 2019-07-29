// sets the current rate to the default value
// run it with: "truffle migrate -f 2000 --to 2000" or "setrate:default"

const Rates = artifacts.require("./Rates.sol");
const newRate = 99800;

module.exports = function(deployer) {
    deployer.then(async () => {
        const rates = Rates.at(Rates.address);
        await rates.setRate("EUR", newRate);
    });
};
