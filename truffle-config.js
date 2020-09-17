require("dotenv").config();

const HDWalletProvider = require("@truffle/hdwallet-provider");

const MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

module.exports = {
    // Workaround of --migrations_directory flag removed truffle test.
    // We will pass --migrations_directory to truffle migrate instead (./migrations)
    migrations_directory: "./migrations_null",
    compilers: {
        solc: {
            version: "0.4.24",
            docker: false, // TODO: check if we could use this for better docker integration
            parser: "solcjs", // Leverages solc-js purely for speedy parsing
            settings: {
                optimizer: {
                    enabled: false,
                },
                // evmVersion: <string> // Default: "petersburg"
            },
        },
    },
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "999",
            gasPrice: 1000000000, // 1 GWEI
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555, // <-- If you change this, also set the port option in .solcover.js.
            gas: 0xfffffffffff, // <-- Use this high gas value
            gasPrice: 0x01, // <-- Use this low gas price
        },
        truffleLocal: {
            host: "localhost",
            port: 9545,
            network_id: "4447",
            gas: 4707806,
        },
        privatechain: {
            host: "localhost",
            port: 8565,
            network_id: "1976",
            gas: 4707806,
        },
        rinkeby: {
            host: "localhost", // Connect to geth on the specified
            port: 8544,
            from: "0xae653250B4220835050B75D3bC91433246903A95", // default address to use for any transaction Truffle makes during migrations
            network_id: 4,
            gas: 4700000, // Gas limit used for deploys
            gasPrice: 1000000000, // 1 Gwei
        },
        rinkebyFork: {
            // Rinkeby deploy Forks for dry runs.
            // Couldn't make it work yet, queries pending:
            //  launch with ganache-cli --fork http://localhost:8544 --port 8575
            host: "localhost", // Connect to geth on the specified
            port: 8546,
            from: "0xae653250B4220835050B75D3bC91433246903A95", // default address to use for any transaction Truffle makes during migrations
            network_id: 4,
            gas: 4700000, // Gas limit used for deploys
            gasPrice: 1000000000, // 1 Gwei
        },
        ropsten: {
            host: "localhost", // Connect to geth on the specified
            port: 8545,
            network_id: 3,
            gas: 4700000, // Gas limit used for deploys
            gasPrice: 140000000000, // 140 Gwei
        },
        mainnet: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://mainnet.infura.io/v3/" + INFURA_PROJECT_ID),
            network_id: 1,
            gasPrice: 6000000000, // 6 Gwei
        },
        rinkebyInfura: {
            provider: () => new HDWalletProvider(MNEMONIC, "https://rinkeby.infura.io/v3/" + INFURA_PROJECT_ID),
            network_id: 4,
            gasPrice: 6000000000, // 6 Gwei
        },
    },
};
