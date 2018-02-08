# Augmint Contracts - development environment

## Install

_We recently split the codebase into [`augmint-web`](https://github.com/Augmint/augmint-web) and [`augmint-contracts`](https://github.com/Augmint/augmint-contracts). Please raise an issue if these instructions shouldn't work for you._

These instructions are about the dev environment for contract development. For UI development see [augmint-web repo](https://github.com/Augmint/augmint-web)

### OSX

_NB: these steps are likely to work on linux too but it's not tested yet_

1. [Git](https://git-scm.com/download)
1. [Ethereum CLI](https://www.ethereum.org/cli)
1. [nodejs](https://nodejs.org/en/download/) v8.5.0  
   _use version 8.5.0, ganache regularly crashes with newer version (FE also works with 8.9.4)_
1. then:
    ```
    git clone https://github.com/Augmint/augmint-contracts.git
    cd augmint-contracts
    npm install
    ```

### Windows

_Note: It is recommended to use PowerShell (win+X => powershell)_

1. [Git Bash](https://git-for-windows.github.io/) (required for truffle & yarn start)
1. [Git](https://git-scm.com/download) (if you haven't installed it as part of Git Bash in previous step)
1. [Ethereum CLI](https://www.ethereum.org/cli) - including development tools
1. [Node Version Manager(NVM)](https://github.com/coreybutler/nvm-windows/releases)
1. [nodejs](https://nodejs.org/en/download/) v8.5.0 or from command line:
   ```
   nvm install 8.5.0
   nvm use 8.5.0
   ```
1. Truffle Ethereum Framework:
   ```
   npm install -g truffle
   ```
1. [Ganache GUI (TestRPC)](http://truffleframework.com/ganache/) or from command line:
   ```
   npm install -g ganache-cli
   ```
   _Config details in runganche.bat_
   
1. Get the source code:
    ```
    git clone https://github.com/Augmint/augmint-web.git
    cd augmint-contracts
    npm install
    ```

## Launch

### 1. Update to latest augmint-contracts

```
git pull
npm install # if there were any node package changes in packages.json
```

### 2. Deploy to network

#### ganache-cli (formerly testrpc)

`npm run ganache:runmigrate`  
or

* `npm run ganache:run` or `./runganache.sh` (windows: `./runganache.bat`)
* in separate console:  
  `npm run truffle:migrate`  
  or to overwrite existing migration:  
  `$(npm bin)/truffle migrate --reset`

## Tests

```
npm run ganache:runmigrate
truffle test
```

## Sequence diagrams

Sequence diagrams in docs folder are created with [plant UML](http://plantuml.com/sequence-diagram).
To edit them there are two Atom editor plugins: [plantuml-preview](https://atom.io/packages/plantuml-preview) and [language-plantuml](https://atom.io/packages/language-plantuml)

## Non ganache launches/deploys

### Private chain

#### First init

```
cd privatechain
./createprivatechain.sh
cd ..
truffle migrate
cp ./build/contracts/\* ./src/contractsBuild
```

#### Launch

```
cd privatechain
./runprivatechain.sh
```

#### Reset privatechain

```
cd privatechain
rm -r chaindata/geth
./createprivatechain.sh
cd ..
truffle migrate --network privatechain
cp ./build/contracts/\* ./src/contractsBuild
```

### Rinkeby

```
./runrinkeby.sh
truffle migrate --network rinkeby
cp ./build/contracts/\* ./src/contractsBuild
```

_NB: truffle migrate works with geth stable 1.7.2 only. Follow [this issue](https://github.com/trufflesuite/truffle/issues/721)._

### WIP (ignore it) alternative ganache launches

#### Alternatively: Ganache UI

If you use [ganache UI](http://truffleframework.com/ganache/) then

* set the port to 8545
* For running UI tests set mnemonic:  
  `hello build tongue rack parade express shine salute glare rate spice stock`

#### Alternatively: truffle develop

_NB: truffle runs local chain on localhost:9545_

1. `truffle develop`
1. in truffle console:  
   `migrate` or  
   `migrate --reset` to overwrite existing migration
1. `cp ./build/contracts/* ./src/contractsBuild` (TODO: this step is needed b/c of a [truffle-migrate issue #10](https://github.com/trufflesuite/truffle-migrate/issues/10) )

    _TODO: use same mnemonic & port as `runganache.sh`_
