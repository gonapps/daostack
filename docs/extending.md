# Extending DAOStack

DAOStack is built in a modular way and lets you create custom elements that are not already available. 
Doing this involves creating custom solidity contracts that inherit from the base contracts DAOStack provides.

## Installing the Solidity library

1. `npm i --save daostack-arc`

## Creating a [Scheme](ref/Scheme.md)

```
import "daostack-arc/contracts/universalShchems/UniversalScheme.sol"

contract MyAwesomeScheme is UniversalScheme { ... }
```

TODO...

## Creating a [GlobalConstraint](ref/GlobalConstraint.md)

```
import "daostack-arc/contracts/globalConstraints/GlobalConstraintInterface.sol"

contract MyAwesomeGC is GlobalConstraintInterface { ... }
```

Examples: [TokenCapGC](ref/globalConstraints/TokenCapGC.md)

TODO...