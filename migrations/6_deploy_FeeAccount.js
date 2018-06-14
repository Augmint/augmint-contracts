const FeeAccount = artifacts.require("./FeeAccount.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(
        FeeAccount,
        accounts[0],
        2000, // transferFeePt in parts per million = 0.2%
        2, // min: 0.02 A-EUR
        500 // max fee: 5 A-EUR);
    );
};
