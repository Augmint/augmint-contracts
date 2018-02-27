module.exports = {
    compileCommand: "../node_modules/.bin/truffle compile",
    testCommand: "../node_modules/.bin/truffle test --network coverage",
    // skip interfaces until this resolved: https://github.com/sc-forks/solidity-coverage/issues/162
    skipFiles: [
        "interfaces/ERC20Interface.sol",
        "interfaces/TokenReceiver.sol",
        "generic/SignCheck.sol"
    ]
};
