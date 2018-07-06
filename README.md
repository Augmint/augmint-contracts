<span style="display:block;text-align:center">![Augmint](http://www.augmint.cc/android-chrome-192x192.png)
</span>

# Augmint - Stable Digital Tokens - Solidity Contracts

[![Build Status](https://travis-ci.org/Augmint/augmint-contracts.svg?branch=staging)](https://travis-ci.org/Augmint/augmint-contracts)
[![Coveralls github branch](https://img.shields.io/coveralls/github/Augmint/augmint-contracts/staging.svg)](https://coveralls.io/github/Augmint/augmint-contracts)
[![Greenkeeper badge](https://badges.greenkeeper.io/Augmint/augmint-contracts.svg)](https://greenkeeper.io/)
[![Discord](https://img.shields.io/discord/407574313810788364.svg)](https://discord.gg/PwDmsnu)
[![license](https://img.shields.io/github/license/Augmint/augmint-contracts.svg)](https://github.com/Augmint/augmint-contracts/blob/master/LICENSE)

Decentralised stable cryptocurrency on Ethereum

## Concept

Augmint provides digital tokens, value of each token pegged to a fiat currency.

The first Augmint token will be A-EUR (Augmint Crypto Euro), pegged to EUR.

The value of 1 A-EUR is always closely around 1 EUR.

Augmint tokens are cryptocurrency tokens with all the benefits of cryptocurrencies: stored securely in a decentralised manner and instantly transferable worldwide.

Read more and try it: **[www.augmint.cc](http://www.augmint.cc)**

**[Our Trello board](https://trello.com/b/RYGAt2so/augmint-documents)** with a collection of documents about the project.

**[White paper draft](http://bit.ly/augmint-wp)** - Work in progress. Please feel free to comment it: questions, ideas, suggestions are welcome.

## Components

[Web frontend repo](https://github.com/Augmint/augmint-web)

## Flows

[Contract dependency graph](docs/contractDependencies.png)

Sequence diagrams:

*   [Loan flow](docs/loanFlow.png)
*   [Lock flow](docs/lockFlow.png)
*   [Exchange flow](docs/exchangeFlow.png)
*   [Reserve Sales flow](docs/reserveSalesFlow.png) _(not implemented yet)_

[Flow of funds](https://docs.google.com/document/d/1IQwGEsImpAv2Nlz5IgU_iCJkEqlM2VUHf5SFkcvb80A/#heading=h.jsbfubuh6okn)

## Solidity Contracts

*   [Restricted.sol](./contracts/generic/Restricted.sol)  
    Stores permissions per address
*   [MultiSig.sol](./contracts/generic/MultiSig.sol)  
    Abstract contract to manage multi signature approval and execution of atomic, one-off contract scripts
*   [StabilityBoardProxy.sol](./contracts/generic/StabilityBoardProxy.sol)  
    Augmint parameters can be set only via this contract with a quorum approving a contract script to run.
*   [ERC20.sol](./contracts/generic/ERC20.sol)  
    Standard [ERC20](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) token interface.
*   [SystemAccount.sol](./contracts/generic/ERC20.sol)
    Abstract contract to maintain balances of Augmint system accounts
*   [AugmintReserves](./contracts/AugmintReserves.sol)
    *   Holds Augmint's ETH and token reserves
*   [InterestEarnedAccount](./contracts/InterestEarnedAccount.sol)
    *   Holds interest earning from token lending - only from repaid loans, i.e. already "earned"
    *   Provides interest for Locks
*   [FeeAccount.sol](./contracts/FeeAccount.sol)
    *   holds all fees: tokens from transfer and exchange fees (to be implemented) + ETH fees from defaulting fees
    *   calculates transferFees
*   [AugmintToken.sol](./contracts/generic/AugmintToken.sol)  
    Base contract for all Augmint tokens, [TokenAEur.sol](./contracts/TokenAEur.sol) being the first implementation.
    *   ERC20 standard functions
    *   maintains account token balances
    *   Generic `transferAndNotify` "convenience" function
    *   allows MonetarySupervisor to issue tokens on loan disbursement and for reserve
    *   allows accounts to burn their tokens (used by repay loan and burn from reserves via MonetarySupervisor contract)
*   [MonetarySupervisor.sol](./contracts/MonetarySupervisor.sol)
    *   maintains system wide KPIs (totalLockAmount, totalLoanAmount)
    *   enforces system wide limits (Loan to Deposit ratio limits)
    *   issue to & from reserve functions
*   [TokenAEur.sol](./contracts/TokenAEur.sol)
    *   First AugmintToken contract instance, pegged for pegged to EUR (A-EUR aka Augmint Crypto Euro aka A€ )
    *   Sets standard token parameters (name, symbol, decimals, peggedSymbol etc.)
*   [Rates.sol](./contracts/Rates.sol)  
    A contract to return fiat/ETH exchange rates.
*   [Exchange.sol](./contracts/Exchange.sol)  
    EUR / ETH exchange contract. Sell or buy A-EUR for ETH
*   [LoanManager.sol](./contracts/LoanManager.sol)
    *   Loan products and their parameters
    *   Maintains all loans via new loan, repayment, collection functions
    *   Holds collateral in escrow
*   [Locker.sol](./contracts/Lock.sol)
    *   Lock products and parameters
    *   Token funds locking and releasing
    *   Holds locked tokens (with interest)

## Contribution

Augmint is an open and transparent project.

We are seeking for great minds to extend our core team. Contribution in any area is much appreciated: development, testing, UX&UI design, legal, marketing spreading the word etc.

**[Development environment setup](docs/developmentEnvironment.md)**

## Get in touch

Drop us an email: hello@augmint.cc  
 or  
say hi on our [Discord server](https://discord.gg/PwDmsnu): [![Discord](https://img.shields.io/discord/407574313810788364.svg)](https://discord.gg/PwDmsnu)

## Authors

![DECENT](http://www.decent.org/images/logo-voronoi_120x33.png)

The project was born at [DECENT Labs](http://www.decent.org)

### Concept, initial version

*   [szerintedmi](https://github.com/szerintedmi)
*   [Charlie](https://github.com/krosza)

Check the whole team on [augmint.cc](http://www.augmint.cc)

## Licence

This project is licensed under the GNU Affero General Public License v3.0 license - see the [LICENSE](LICENSE) file for details.
