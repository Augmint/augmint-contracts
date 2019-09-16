const Main0029_setup_loanmanager_permissions = artifacts.require("./Main0029_setup_loanmanager_permissions.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0029_setup_loanmanager_permissions);
    });
};