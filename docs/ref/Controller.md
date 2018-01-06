# [Controller](https://github.com/daostack/daostack/blob/master/contracts/controller/Controller.sol#15)

The controller is the central component of a DAO and acts as a glue that binds together other components.
Each controller holds several important components:
1. An [Avatar](Avatar.md) instance used to interact with the outside world.
2. A set of [Scheme](Scheme.md)s that defines a set of "if then" rules the organization follows.
3. A set of [Global Constraint](GlobalConstraint.md)s that define a set of global conditions that must hold before and after each action the DAO performs.
4. A [Reputation](Reputation.md) system used to assing importance to participants in the DAO.
5. A native [DAO token](DaoToken.md) that is used by the dao as a medium of value exchange and to reward participants for positive actions.

## Usage examples

TODO...

## Reference

TODO...