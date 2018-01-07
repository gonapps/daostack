# Resources

* [Reference](ref.md)
* [Guides & Recipes](guides.md)

# Concepts

## An Overview of Arc

Arc is the lower layer of the DAOStack. It consists of several smart contracts deployed on the Ethereum blockchain that define the basic building blocks and standard components that can be used to implement any DAO.

The DAOStack:
1. [Ethereum](https://www.ethereum.org/) - *Base blockchain.*
2. ArcHives - *A public curated database of [element](#element)s, organizations and a shared place for community collaboration*.
3. **Arc - This project**
4. [Arc.js](https://github.com/daostack/arc-js) - *Javascript library that talks to Arc, built on top of web3.js.*
5. [Alchemy](https://github.com/daostack/Alchemy-Aurelia) (and more...) - *Collaborative DApps, built on top of DAOStack using Arc.js*

### The Structure of a DAO

Each DAO consists of the following components:

* **Native token** - *A Standard [ERC20 token](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) that defines the value system of the DAO, participants are rewarded for their contributions based on this token*.
* **Reputation system** - *Similar to native token but is **non-transferable**, the reputation is used system is used to assign an importance to participants and their votes*.
* **Avatar** - *This is the public facing part of the DAO that handles the interaction of the DAO with the rest of the world(interacing with other DAOs, paying third party participants, etc...)*.
* **Subscribed elements** - *The set of Schemes and Global Constraints the DAO consists of*.

Those components are orginized in a single smart contract called a *Controller*.

### Elements

The main configurable and extendable building blocks of DAOs are: *Schemes* and *Global Constraints*, which are collectivley called *elements*.
* **Schemes** *define the "do's" of the DAO, defining rules under which actions are taken, based on the participants input.* Examples of Schemes are:
    * Rewarding contributions if other participants recognize them as worthy.
    * Voting on proposals and automatically executing the chosen proposal.
* **Global constraints** *define the "don't" of the DAO, they define conditions that must always hold and can prevent an action from being taken if it violates these conditions.* Examples of Global Constraints are:
    * Limiting the amount of tokens or reputation that can be minted per day.
    * Blacklisting certain participants from performing certain actions.

### ArcHives and the Developer Ecosystem

#### Compendium

Developers can create and extend *elements* to define more rules that DAOs can subscribe to. Those *elements* can then be registered(for a fee) to a public database called *Compendium*. Developers get compensated for their work every time DAOs subscribes to one of their registered elements.

# Getting Started

## As a Solidity library

1. Install npm package: `yarn add daostack-arc`/ `npm install daostack-arc`
2. Import in your project. `import 'daostack-arc/contracts/...';`

Example:
```
import 'daostack-arc/contracts/universalShchems/UniversalScheme.sol';
contract MyAwesomeScheme is UniversalScheme { ... }
```

## Contributing to Arc

1. `$ yarn global add truffle ethereumjs-testrpc` - prerequisites: have [truffle](https://github.com/trufflesuite/truffle) and [testrpc](https://github.com/ethereumjs/testrpc) installed.
2. `$ git clone https://github.com/daostack/daostack.git` - clone the repo.
3. `$ cd daostack`
4. `/daostack/$ yarn` - install dependencies.

*Note: Windows environments are not currently supported, please use a Unix based dev environment*.

Commands:
* `truffle test` - run unit tests.
* `yarn lint` - lint javascript files.
* `yarn solium` - lint Solidity files.


This is an open source project ([GPL licence](https://github.com/daostack/daostack/blob/master/LICENSE)).
PRs are welcome but please first consult with the [Contribution guide](https://github.com/daostack/daostack/blob/master/CONTRIBUTING.md).
Join us on [Slack](https://daostack.slack.com/)!

## Contributing to Arc Docs
Same as above, with the following extra rules:
* All docs are `.md` files that live under `docs/`.
* Please work in branches that start with `doc` (example: `doc-gen`).
* In case of missing or incorrect documentation please open an issue with the label `documentation`, indicating the file, line number and any extra details.