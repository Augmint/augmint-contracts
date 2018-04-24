# Augmint Contracts - Migration instructions

## Rinkeby (instructions are WIP!)

NB: New deployments to Rinkeby is now a testbed for future mainnet upgrades. I.e. we shouldn't do complete redeploys just new migrations.

1.  Add new migration test scripts in `rinkeby_migrations` folder.  
    NB: add only new steps, dont change earlier ones. Check [Contract dependency graph](docs/contractDependencies.png) and [contract migrations google sheet](https://docs.google.com/spreadsheets/d/1qTbWroOfUV3OqEjlD3LmsqCGB7WpF99e0UYpjvsZPvk/edit?usp=sharing)
1.  `yarn clean && truffle compile`
1.  `./runrinkeby.sh` (wait for blocks to sync)
1.  `truffle migrate --network rinkeby --migrations_directory=./rinkeby_migrations`
1.  `yarn abiniser` or `yarn abiniser --network-id 4`
1.  manually cross check changes in `./abiniser` folder then commit them

### Front end

TODO from here to revise with new abiniser output:

1.  `cp augmint-contracts/build/contracts/* augmint-web/src/contractsBuild`
1.  Test new contracts locally/on staging with augmint-web
1.  Deploy augmint web with new contract addresses to staging (i.e. push `src/contractsBuild`)
1.  Test on staging
1.  TODO: if rates contract changed then stop augmint-ratesfeeder feeding old rates contract and set rates to 0 on old contract (this will stop new loans on old contract)
1.  TODO: migrate InterestEarnedAccount , AugmintReserves etc balances if any changed

_NB: truffle migrate tested with geth 1.8.4-stable._

## Main network

TODO
