# Augmint Contracts - development environment

-   [Install](#Install)
-   [Launch](#Launch)
-   [Tests](#Tests)
-   [Docker Image](#Docker-Image)
-   [Sequence diagrams](#Sequence-diagrams)
-   [Non ganache launches/deploys](#Non-ganache-launchesdeploys) -

## Install

These instructions are about the dev environment for contract development. For UI development see [augmint-web repo](https://github.com/Augmint/augmint-web)

### OSX

_NB: these steps are likely to work on linux too but it's not tested yet_

1.  [Git](https://git-scm.com/download)
1.  [Ethereum CLI](https://www.ethereum.org/cli)
1.  [nodejs](https://nodejs.org/en/download/) - _tested with v10.15.3_
1.  Install yarn if you don't have it: `npm install -g yarn` NB: check current yarn version requirement in packages.json
1.  ```
    git clone https://github.com/Augmint/augmint-contracts.git
    cd augmint-contracts
    yarn install
    ```

### Windows

_NB: windows install was not tested since a while, update on it is welcome_

1.  [Git Bash](https://git-for-windows.github.io/) (required for truffle & yarn start)
1.  [Git](https://git-scm.com/download) (if you haven't installed it as part of Git Bash in previous step)
1.  [Ethereum CLI](https://www.ethereum.org/cli) - including development tools
1.  Install latest stable Nodejs

    or
    use [Node Version Manager(NVM)](https://github.com/coreybutler/nvm-windows/releases):

    ```
    nvm install 10.15.3
    nvm use 10.15.3
    ```

1.  in Git bash:
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

`yarn start` (runs `truffle migrate` with `--reset` flag)

or

-   `yarn ganache:run` or `./scripts/runganache.sh`
-   in separate console:  
    `yarn migrate`  
    or to overwrite existing migration:  
    `yarn migrate --reset`

NB: if you get this error from migration:

```
Error: Attempting to run transaction which calls a contract function, but recipient address 0xd217ac4354211cda27dd4027b5e223280f885ad3 is not a contract address
```

then you either need to do a `yarn clean` before `yarn migrate` or run migration as `yarn migrate --reset`

## Tests

```
yarn start
yarn test
```

## Docker Image

A docker image with an initial state of the contracts in ganache is published for development of dependent packes: [hub.docker.com/r/augmint/contracts](https://hub.docker.com/r/augmint/contracts)

## Running docker image

```
docker run --name ganache -p 8545:8545 augmint/contracts:latest --db ./dockerLocalchaindb --gasLimit 0x47D5DE --gasPrice 1000000000 --networkId 999 -m "hello build tongue rack parade express shine salute glare rate spice stock"
```

then
`docker stop ganache` and `docker start ganache`

## Building docker images

-   `localchaindb:builddocker` : deletes local chain data folder (`./localchaindb`), launches ganache, migrates contracts and builds a docker image with `localdockerimage` name
-   `docker:run` : removes previous `ganache` container and runs a new from the docker image labeled `localdockerimage`
-   `docker:start` & `docker:stop`: start / stop `ganache` container
-   publish: manual at the moment, an automated workflow is being setup.  
    `docker tag localdockerimage augmint/contracts:<versions>`  
    `docker tag augmint/contracts:v1.x.x augmint/contracts:latest`  
    `docker login`  
    `docker push augmint/contracts`

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

### Rinkeby & main networks

For new deploys on rinkeby and main net see [migration instructions](migrations.md)

### Alternative ganache launches

#### Alternatively: Ganache UI

If you use [ganache UI](http://truffleframework.com/ganache/) then

-   set the port to 8545
-   For running UI tests set mnemonic:  
    `hello build tongue rack parade express shine salute glare rate spice stock`

#### Alternatively: truffle develop

_NB: truffle runs local chain on localhost:9545_

1.  `truffle develop`
1.  in truffle console:  
    `migrate` or  
    `migrate --reset` to overwrite existing migration
1.  `cp ./build/contracts/* ./src/contractsBuild`

    _TODO: use same mnemonic & port as `runganache.sh`_
