# Augmint Contracts - Migration instructions

## Steps (instructions are WIP)

1.  if augmint token changed then add old augmint token address to

    *   `augmint-contracts/migrations/98_add_legacyTokens.js`
    *   `augmint-web/src/modules/ethereum/legacyBalancesTransactions.js` (`ACCEPTED_LEGACY_AEUR_CONTRACTS` constant)  
        This will allow augmint web to display old token balance to users and let them convert it to new contract

1.  TODO: if loan/lock/exchange/monetarysupervisor contracts changed then save older versions of web in order to allow users to access them (migration scripts and augmint-web?)
1.  `yarn clean && truffle compile`
1.  `yarn start` - Deploy to ganache to save local addresses
1.  Stop ganache and `./runrinkeby.sh` (wait for blocks to sync)
1.  `truffle migrate --network rinkeby`
1.  `cp augmint-contracts/build/contracts/* augmint-web/src/contractsBuild`
1.  Test new contracts locally/on staging with augmint-web
1.  Deploy augmint web with new contract addresses to staging (i.e. push `src/contractsBuild`)
1.  Test on staging
1.  TODO: if rates contract changed then stop augmint-ratesfeeder feeding old rates contract and set rates to 0 on old contract (this will stop new loans on old contract)
1.  TODO: migrate InterestEarnedAccount , AugmintReserves etc balances if any changed

## Rinkeby

```
./runrinkeby.sh
truffle migrate --network rinkeby
cp ./build/contracts/\* ./src/contractsBuild
```

_NB: truffle migrate tested with geth 1.8.3-stable._

## Main network

TODO
