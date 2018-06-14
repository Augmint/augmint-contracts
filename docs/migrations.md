# Augmint Contracts - Migration instructions

## Rinkeby (instructions are WIP!)

NB: New deployments to Rinkeby is now a testbed for future mainnet upgrades. I.e. we shouldn't do complete redeploys just new migrations.

1.  Add new migration test scripts in `rinkeby_migrations` folder.  
    _NB: add only new steps, dont change earlier ones. Check [Contract dependency graph](docs/contractDependencies.png) and [contract migrations google sheet](https://docs.google.com/spreadsheets/d/1qTbWroOfUV3OqEjlD3LmsqCGB7WpF99e0UYpjvsZPvk/edit?usp=sharing)_

1.  `yarn clean && truffle compile`

1.  Dry run

    *   Test the migration script

    ```
    ./runrinkeby.sh
    truffle migrate --dry-run -f <migration step number> --network rinkeby --migrations_directory=./rinkeby_migrations
    ```

    *   Test results (not working)  
        _NB: Ideally this way we could test the result of migration via truffle console and UI.
        It doesn't work currently: Truffle migrate hangs, we couldn't unlock rinkeby account and historic queries seem to hang._

    ```
    yarn ganache-cli --fork http://localhost:8544 --port 8546 --db ./chain
    yarn truffle migrate -f <migration step number> --network rinkebyFork --migrations_directory=./rinkeby_migrations
    ```

1.  Migration

    ```
    #
    yarn clean && yarn compile
    yarn truffle migrate -f <migration step number> --network rinkeby --migrations_directory=./rinkeby_migrations
    ```

    Notes:

    *   You need to set `last_completed_migration` in truffle's Migrations contract in your migration script:
        ```
        await Migrations.at("<Migrations contract address,").setLastCompletedMigration("")
        ```
        _NB: In theory `truffle migrate` would query last_completed_migration from deployed contract but you likely cleared truffe json files from where truffle reads deployment address of Migrations contract. Therefore it a) can't update the Migration contract and that's why you need to specify the migration step with -f_
    *   You can specify any arbitrary `<migration step number>` if you need to rerun a failed migration.

    *   `yarn clean` is to ensure abiniser only extracts info about real deployments from truffle artifacts (e.g. output from previous dry runs in contracts/build folder would pollute abiniser/deployments files)
    *   `truffle migrate` tested with Truffle v4.1.7 and Geth 1.8.6-stable.

1.  Update resources artificats:

    ```
    yarn abiniser
    ```

    Cross check changes manually in `./abiniser` folder before commit

1.  Tag it in gitgit

    ```
    git tag -a vx.x.x -m "Deployed to rinkeby, last migration step xxx"
    git push --tags
    ```

    Tag format in vx.x.x semver format TBD: shall we tag with last migration step no.? Eg. Rinkeby_12, Main_33

1.  push + merge to staging & master

### Front end

TODO: Revise with new abiniser output + tackling new exchange, lock, loanManager versions...

1.  update augmint-contracts subprop
1.  `cp -r augmint-contracts/abiniser/* src/abiniser`
1.  Update contract abi references (if changed) in UI
1.  Test new contracts locally/on staging with augmint-web

### Ratesfeeder

TODO: revise this

1.  release new contract and abiniser info to augmint-ratesfeeder
1.  feeding old rates contract and set rates to 0 on old contract (this will stop new loans on old contract)

## Main network

```
truffle migrate --network mainnet --migrations_directory=./mainnet_migrations/ -f <migration step> --dry-run
```

Use `.env` to set:

*   `DEPLOYER_ACCOUNT_MNENOMIC`
*   `INFURA_API_KEY`

NB:

*   `Migrations.sol` is deployed but manually updated by deployer account (`deployer.deploy()` in migrations scripts is within `deployer.then()`, so truffle is not updating migrations automatically).  
    Don't rely on `last_completed_migration` because it might be out of sync.
*   Couldn't make Ledger or Trezor wallet to work with `truffle migrate` yet. But deployer account doesn't require HW wallet level security because deployer account doesn't have any special permissions on the system once it removed itself from the signers after initial deploy.
