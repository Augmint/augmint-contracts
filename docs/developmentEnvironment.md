# Augmint Contracts - development environment

## Install

These instructions are about the dev environment for contract development. For UI development see [augmint-web repo](https://github.com/Augmint/augmint-web)

### OSX

_NB: these steps are likely to work on linux too but it's not tested yet_

1. [Git](https://git-scm.com/download)
1. [Ethereum CLI](https://www.ethereum.org/cli)
1. [nodejs](https://nodejs.org/en/download/) - _tested with v8.9.4_
1. Install yarn if you don't have it: `npm install -g yarn`
1. ```
   git clone https://github.com/Augmint/augmint-contracts.git
   cd augmint-contracts
   yarn install
   ```

### Windows

_NB: windows install was not tested since a while, update on it is welcome_

1. [Git Bash](https://git-for-windows.github.io/) (required for truffle & yarn start)
1. [Git](https://git-scm.com/download) (if you haven't installed it as part of Git Bash in previous step)
1. [Ethereum CLI](https://www.ethereum.org/cli) - including development tools
1. Install latest stable Nodejs (tested with 8.9.4)

    or
    use [Node Version Manager(NVM)](https://github.com/coreybutler/nvm-windows/releases):

    ```
    nvm install 8.9.4
    nvm use 8.9.4
    ```

1. in Git bash:
    ```
    git clone https://github.com/Augmint/augmint-contracts.git
    cd augmint-contracts
    yarn install
    ```

## Launch

### 1. Update to latest augmint-contracts

```
git pull
yarn install # if there were any node package changes in packages.json
```

### 2. Deploy to network

#### ganache-cli (formerly testrpc)

`yarn run ganache:runmigrate`  
or

* `yarn run ganache:run` or `./runganache.sh` (windows: `./runganache.bat`)
* in separate console:  
  `yarn run truffle:migrate`  
  or to overwrite existing migration:  
  `$(yarn bin)/truffle migrate --reset`

## Tests

```
yarn run ganache:runmigrate
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

_NB: truffle migrate works with geth 1.8.0-stable. If you are using an unstable version then follow [this issue](https://github.com/trufflesuite/truffle/issues/721)._

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
