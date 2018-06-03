const PreTokenAgreementSigner = artifacts.require("./PreTokenAgreementSigner.sol");

module.exports = function(deployer) {
    deployer.deploy(PreTokenAgreementSigner);
};
