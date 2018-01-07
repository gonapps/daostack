pragma solidity ^0.4.18;

import "./Avatar.sol";
import "./Reputation.sol";
import "./DAOToken.sol";
import "../globalConstraints/GlobalConstraintInterface.sol";

/**
 * @title Controller contract
 * @dev A controller controls the organizations tokens,reputation and avatar.
 * It is subject to a set of schemes and constraints that determine its behavior.
 * Each scheme has it own parameters and operation permmisions.
 */
contract UController {

    struct Scheme {
       bytes32 paramsHash;  // a hash "configuration" of the scheme
       bytes4  permissions; // A bitwise flags of permissions,
                           // All 0: Not registered,
                           // 1st bit: Flag if the scheme is registered,
                           // 2nd bit: Scheme can register other schemes
                           // 3th bit: Scheme can add/remove global constraints
                           // 4rd bit: Scheme can upgrade the controller
    }

    struct GlobalConstraint {
       address gcAddress;
       bytes32 params;
    }

    struct GlobalConstraintRegister {
        bool register; //is register
        uint index;    //index at globalConstraints
    }

    struct Organization {
      DAOToken                  nativeToken;
      Reputation                nativeReputation;
      mapping(address=>Scheme)  schemes;
      // globalConstraints that determine pre- and post-conditions for all actions on the controller
      GlobalConstraint[] globalConstraints;
      // globalConstraintsRegister indicate is a globalConstraints is register or not
      mapping(address=>GlobalConstraintRegister) globalConstraintsRegister;
    }

    //mapping between organization's avatar address to Organization
    mapping(address=>Organization) organizations;
  // newController will point to the new controller after the present controller is upgraded
  //  address public newController;
    mapping(address=>address) public newControllers;//mapping between avatar address and newController address

    /*OrganizationRegister registery;
    Avatar  ownerAvatar;*/


    event MintReputation (address indexed _sender, address indexed _beneficiary, int256 _amount,address indexed _avatar);
    event MintTokens (address indexed _sender, address indexed _beneficiary, uint256 _amount, address indexed _avatar);
    event RegisterScheme (address indexed _sender, address indexed _scheme,address indexed _avatar);
    event UnregisterScheme (address indexed _sender, address indexed _scheme, address indexed _avatar);
    event GenericAction (address indexed _sender, bytes32[] _params);
    event SendEther (address indexed _sender, uint _amountInWei, address indexed _to);
    event ExternalTokenTransfer (address indexed _sender, address indexed _externalToken, address indexed _to, uint _value);
    event ExternalTokenTransferFrom (address indexed _sender, address indexed _externalToken, address _from, address _to, uint _value);
    event ExternalTokenIncreaseApproval (address indexed _sender, StandardToken indexed _externalToken, address _spender, uint _value);
    event ExternalTokenDecreaseApproval (address indexed _sender, StandardToken indexed _externalToken, address _spender, uint _value);
    event AddGlobalConstraint(address _globalconstraint, bytes32 _params);
    event RemoveGlobalConstraint(address _globalConstraint ,uint256 _index);
    event UpgradeController(address _oldController,address _newController,address _avatar);

    function UController(/*Avatar _ownerAvatar,OrganizationRegister _registery*/)
    public
    {
      /*ownerAvatar = _avatar;
      registery = _registery;*/
    }

    function newOrganization(
        Avatar _avatar,
        address[] _schemes,
        bytes32[] _params,
        bytes4[] _permissions
    ) public
    {
        organizations[address(_avatar)].nativeToken = _avatar.nativeToken();
        organizations[address(_avatar)].nativeReputation = _avatar.nativeReputation();
        // Register the schemes:
        for (uint i = 0; i < _schemes.length; i++) {
            organizations[address(_avatar)].schemes[_schemes[i]] = Scheme({paramsHash: _params[i],permissions: _permissions[i]|bytes4(1)});
            RegisterScheme(msg.sender, _schemes[i],_avatar);
        }
    }

  // Modifiers:
    modifier onlyRegisteredScheme(address avatar) {
        require(organizations[avatar].schemes[msg.sender].permissions&bytes4(1) == bytes4(1));
        _;
    }

    modifier onlyRegisteringSchemes(address avatar) {
        require(organizations[avatar].schemes[msg.sender].permissions&bytes4(2) == bytes4(2));
        _;
    }

    modifier onlyGlobalConstraintsScheme(address avatar) {
        require(organizations[avatar].schemes[msg.sender].permissions&bytes4(4) == bytes4(4));
        _;
    }

    modifier onlyUpgradingScheme(address _avatar) {
        require(organizations[_avatar].schemes[msg.sender].permissions&bytes4(8) == bytes4(8));
        _;
    }

    modifier onlySubjectToConstraint(address _avatar,bytes32 func) {
        uint index;
        GlobalConstraint[] memory globalConstraints = organizations[_avatar].globalConstraints;
        for (index = 0;index<globalConstraints.length;index++) {
            require((GlobalConstraintInterface(globalConstraints[index].gcAddress)).pre(msg.sender, globalConstraints[index].params, func));
        }
        _;
        for (index = 0;index<globalConstraints.length;index++) {
            require((GlobalConstraintInterface(globalConstraints[index].gcAddress)).post(msg.sender, globalConstraints[index].params, func));
        }
    }

    /**
     * @dev mint reputation .
     * @param  _amount amount of reputation to mint
     * @param _beneficiary beneficiary address
     * @return bool which represents a success
     */
    function mintReputation(address _avatar,int256 _amount, address _beneficiary)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"mintReputation")
    returns(bool)
    {
        MintReputation(msg.sender, _beneficiary, _amount,_avatar);
        return organizations[_avatar].nativeReputation.mint(_beneficiary, _amount);
    }

    /**
     * @dev mint tokens .
     * @param  _amount amount of token to mint
     * @param _beneficiary beneficiary address
     * @return bool which represents a success
     */
    function mintTokens(address _avatar,uint256 _amount, address _beneficiary)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"mintTokens")
    returns(bool)
    {
        MintTokens(msg.sender, _beneficiary, _amount,_avatar);
        return organizations[_avatar].nativeToken.mint(_beneficiary, _amount);
    }

  /**
   * @dev register or update a scheme
   * @param _scheme the address of the scheme
   * @param _paramsHash a hashed configuration of the usage of the scheme
   * @param _permissions the permissions the new scheme will have
   * @return bool which represents a success
   */
    function registerScheme(address _avatar,address _scheme, bytes32 _paramsHash, bytes4 _permissions)
    public
    onlyRegisteringSchemes(_avatar)
    onlySubjectToConstraint(_avatar,"registerScheme")
    returns(bool)
    {
       bytes4 schemePermission = organizations[_avatar].schemes[_scheme].permissions;
       bytes4 senderPermission = organizations[_avatar].schemes[msg.sender].permissions;
    // Check scheme has at least the permissions it is changing, and at least the current permissions:
    // Implementation is a bit messy. One must recall logic-circuits ^^

    // produces non-zero if sender does not have all of the perms that are changing between old and new
        require(bytes4(15)&(_permissions^schemePermission)&(~senderPermission) == bytes4(0));

    // produces non-zero if sender does not have all of the perms in the old scheme
        require(bytes4(15)&(schemePermission&(~senderPermission)) == bytes4(0));

    // Add or change the scheme:
        organizations[_avatar].schemes[_scheme]= Scheme({paramsHash:_paramsHash,
                                                        permissions:_permissions|bytes4(1)});
        RegisterScheme(msg.sender, _scheme, _avatar);
        return true;
    }

    /**
     * @dev unregister a scheme
     * @param _scheme the address of the scheme
     * @return bool which represents a success
     */
    function unregisterScheme(address _avatar,address _scheme )
    public
    onlyRegisteringSchemes(_avatar)
    onlySubjectToConstraint(_avatar,"unregisterScheme")
    returns(bool)
    {
        bytes4 schemePermission = organizations[_avatar].schemes[_scheme].permissions;
    //check if the scheme is register
        if (schemePermission&bytes4(1) == bytes4(0)) {
            return false;
          }
    // Check the unregistering scheme has enough permissions:
        require(bytes4(15)&(schemePermission&(~organizations[_avatar].schemes[msg.sender].permissions)) == bytes4(0));

    // Unregister:
        UnregisterScheme(msg.sender, _scheme,_avatar);
        delete organizations[_avatar].schemes[_scheme];
        return true;
    }

    /**
     * @dev unregister the caller's scheme
     * @return bool which represents a success
     */
    function unregisterSelf(address _avatar) public returns(bool) {
        if (isSchemeRegistered(_avatar,msg.sender) == false) {
            return false;
        }
        delete organizations[_avatar].schemes[msg.sender];
        UnregisterScheme(msg.sender, msg.sender,_avatar);
        return true;
    }

    function isSchemeRegistered(address _avatar, address _scheme) public constant returns(bool) {
        return (organizations[_avatar].schemes[_scheme].permissions&bytes4(1) != bytes4(0));
    }

    function getSchemeParameters(address _avatar,address _scheme) public constant returns(bytes32) {
        return organizations[_avatar].schemes[_scheme].paramsHash;
    }

    function getSchemePermissions(address _avatar,address _scheme) public constant returns(bytes4) {
        return organizations[_avatar].schemes[_scheme].permissions;
    }

  // Global Contraints:
    function globalConstraintsCount(address _avatar) public constant returns(uint) {
        return organizations[_avatar].globalConstraints.length;
    }

    function isGlobalConstraintRegister(address _avatar,address _globalConstraint) public constant returns(bool) {
        return organizations[_avatar].globalConstraintsRegister[_globalConstraint].register;
    }

    /**
     * @dev add or update Global Constraint
     * @param _globalConstraint the address of the global constraint to be added.
     * @param _params the constraint parameters hash.
     * @return bool which represents a success
     */
    function addGlobalConstraint(address _avatar,address _globalConstraint, bytes32 _params)
    public onlyGlobalConstraintsScheme(_avatar) returns(bool)
    {
        Organization storage organization = organizations[_avatar];
        if (!organization.globalConstraintsRegister[_globalConstraint].register) {
            organization.globalConstraints.push(GlobalConstraint(_globalConstraint,_params));
            organization.globalConstraintsRegister[_globalConstraint] = GlobalConstraintRegister(true,organization.globalConstraints.length-1);
        }else {
            organization.globalConstraints[organization.globalConstraintsRegister[_globalConstraint].index].params = _params;
        }
        AddGlobalConstraint(_globalConstraint, _params);
        return true;
    }

    /**
     * @dev remove Global Constraint
     * @param _globalConstraint the address of the global constraint to be remove.
     * @return bool which represents a success
     */
    function removeGlobalConstraint (address _avatar ,address _globalConstraint)
    public onlyGlobalConstraintsScheme(_avatar) returns(bool)
    {
        GlobalConstraintRegister memory globalConstraintRegister = organizations[_avatar].globalConstraintsRegister[_globalConstraint];
        GlobalConstraint[] storage globalConstraints = organizations[_avatar].globalConstraints;


        if (globalConstraintRegister.register) {
            if (globalConstraintRegister.index < globalConstraints.length-1) {
                GlobalConstraint memory globalConstraint = organizations[_avatar].globalConstraints[globalConstraints.length-1];
                globalConstraints[globalConstraintRegister.index] = globalConstraint;
                organizations[_avatar].globalConstraintsRegister[globalConstraint.gcAddress].index = globalConstraintRegister.index;
            }
            globalConstraints.length--;
            delete organizations[_avatar].globalConstraintsRegister[_globalConstraint];
            RemoveGlobalConstraint(_globalConstraint,globalConstraintRegister.index);
            return true;
        }
        return false;
    }

  /**
    * @dev upgrade the Controller
    *      The function will trigger an event 'UpgradeController'.
    * @param  _newController the address of the new controller.
    * @return bool which represents a success
    */
    function upgradeController(address _avatar,address _newController)
    public onlyUpgradingScheme(_avatar) returns(bool)
    {
        require(newControllers[_avatar] == address(0));   // so the upgrade could be done once for a contract.
        require(_newController != address(0));
        newControllers[_avatar] = _newController;
        (Avatar(_avatar)).transferOwnership(_newController);
        if (organizations[_avatar].nativeToken.owner() == address(this)) {
            organizations[_avatar].nativeToken.transferOwnership(_newController);
        }
        if (organizations[_avatar].nativeReputation.owner() == address(this)) {
            organizations[_avatar].nativeReputation.transferOwnership(_newController);
        }
        UpgradeController(this,_newController,_avatar);
        return true;
    }

    /**
    * @dev do a generic deligate call to the contract which called us.
    * This function use deligatecall and might expose the organization to security
    * risk. Use this function only if you really knows what you are doing.
    * @param _params the params for the call.
    * @return bool which represents success
    */
    function genericAction(address _avatar,bytes32[] _params)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"genericAction")
    returns(bool)
    {
        GenericAction(msg.sender, _params);
        return (Avatar(_avatar)).genericAction(msg.sender, _params);
    }

  /**
   * @dev send some ether
   * @param _amountInWei the amount of ether (in Wei) to send
   * @param _to address of the beneficary
   * @return bool which represents a success
   */
    function sendEther(address _avatar,uint _amountInWei, address _to)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"sendEther")
    returns(bool)
    {
        SendEther(msg.sender, _amountInWei, _to);
        return (Avatar(_avatar)).sendEther(_amountInWei, _to);
    }

    /**
    * @dev send some amount of arbitrary ERC20 Tokens
    * @param _externalToken the address of the Token Contract
    * @param _to address of the beneficary
    * @param _value the amount of ether (in Wei) to send
    * @return bool which represents a success
    */
    function externalTokenTransfer(address _avatar,StandardToken _externalToken, address _to, uint _value)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"externalTokenTransfer")
    returns(bool)
    {
        ExternalTokenTransfer(msg.sender, _externalToken, _to, _value);
        return (Avatar(_avatar)).externalTokenTransfer(_externalToken, _to, _value);
    }

    /**
    * @dev transfer token "from" address "to" address
    *      One must to approve the amount of tokens which can be spend from the
    *      "from" account.This can be done using externalTokenApprove.
    * @param _externalToken the address of the Token Contract
    * @param _from address of the account to send from
    * @param _to address of the beneficary
    * @param _value the amount of ether (in Wei) to send
    * @return bool which represents a success
    */
    function externalTokenTransferFrom(address _avatar,StandardToken _externalToken, address _from, address _to, uint _value)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"externalTokenTransferFrom")
    returns(bool)
    {
        ExternalTokenTransferFrom(msg.sender, _externalToken, _from, _to, _value);
        return (Avatar(_avatar)).externalTokenTransferFrom(_externalToken, _from, _to, _value);
    }

    /**
    * @dev increase approval for the spender address to spend a specified amount of tokens
    *      on behalf of msg.sender.
    * @param _externalToken the address of the Token Contract
    * @param _spender address
    * @param _addedValue the amount of ether (in Wei) which the approval is refering to.
    * @return bool which represents a success
    */
    function externalTokenIncreaseApproval(address _avatar,StandardToken _externalToken, address _spender, uint _addedValue)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"externalTokenIncreaseApproval")
    returns(bool)
    {
        ExternalTokenIncreaseApproval(msg.sender,_externalToken,_spender,_addedValue);
        return (Avatar(_avatar)).externalTokenIncreaseApproval(_externalToken, _spender, _addedValue);
    }

    /**
    * @dev decrease approval for the spender address to spend a specified amount of tokens
    *      on behalf of msg.sender.
    * @param _externalToken the address of the Token Contract
    * @param _spender address
    * @param _subtractedValue the amount of ether (in Wei) which the approval is refering to.
    * @return bool which represents a success
    */
    function externalTokenDecreaseApproval(address _avatar,StandardToken _externalToken, address _spender, uint _subtractedValue)
    public
    onlyRegisteredScheme(_avatar)
    onlySubjectToConstraint(_avatar,"externalTokenDecreaseApproval")
    returns(bool)
    {
        ExternalTokenDecreaseApproval(msg.sender,_externalToken,_spender,_subtractedValue);
        return (Avatar(_avatar)).externalTokenDecreaseApproval(_externalToken, _spender, _subtractedValue);
    }

}
