/* this exchange deployment is incorrect because addresses were not passed as strings which resulted
    wrong addresses passed to constructor. A new exchange deploy will be done in upcoming migration step. */
const Exchange = artifacts.require("./Exchange.sol");

const RATES_ADDRESS = 0x4babbe57453e2b6af125b4e304256fcbdf744480;
const TOKENAEUR_ADDRESS = 0x86a635eccefffa70ff8a6db29da9c8db288e40d0;
const STABILITYBOARD_PROXY_ADDRESS = 0x4686f017d456331ed2c1de66e134d8d05b24413d;

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Exchange, STABILITYBOARD_PROXY_ADDRESS, TOKENAEUR_ADDRESS, RATES_ADDRESS);
    });
};
