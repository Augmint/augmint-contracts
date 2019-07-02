const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const LoanManager = artifacts.require("./LoanManager.sol");

const TokenAEurAddress = "0x79065a165Ec09E6A89D584a14872802717FE12a3";
const MonetarySupervisorAddress = "0x4A7F6EcbE8B324A55b85adcc45313A412957B8ea";
const RatesAddress = "0xEE8C7a3e99945A5207Dca026504d67527125Da9C";

module.exports = function(deployer) {
    deployer.then(async () => {

        // ### StabilityBoardProxy ###
        await deployer.deploy(StabilityBoardProxy);

        // ### LoanManager ###
        await deployer.deploy(LoanManager, StabilityBoardProxy.address, TokenAEurAddress, MonetarySupervisorAddress, RatesAddress);
    });
};