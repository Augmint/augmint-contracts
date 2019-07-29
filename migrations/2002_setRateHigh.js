// sets the current rate to a high value
// run it with: "truffle migrate -f 2002 --to 2002" or "setrate:high"

const Rates = artifacts.require("./Rates.sol");
const newRate = 225000;

module.exports = function(deployer) {
    deployer.then(async () => {
        const rates = Rates.at(Rates.address);
        await rates.setRate("EUR", newRate);
    });
};
