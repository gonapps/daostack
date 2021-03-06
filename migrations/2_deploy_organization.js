//this migration file is used only for testing purpose
var constants = require('../test/constants');
var Avatar = artifacts.require('./Avatar.sol');
var Controller = artifacts.require('./Controller.sol');
var GenesisScheme = artifacts.require('./GenesisScheme.sol');
var GlobalConstraintRegistrar = artifacts.require('./GlobalConstraintRegistrar.sol');
var DAOToken = artifacts.require('./DAOToken.sol');
var Reputation = artifacts.require('./Reputation.sol');
var SchemeRegistrar = artifacts.require('./SchemeRegistrar.sol');
var SimpleICO = artifacts.require('./SimpleICO.sol');
var AbsoluteVote = artifacts.require('./AbsoluteVote.sol');
var ContributionReward = artifacts.require('./ContributionReward.sol');
var TokenCapGC = artifacts.require('./TokenCapGC.sol');
var UpgradeScheme = artifacts.require('./UpgradeScheme.sol');
var OrganizationRegister = artifacts.require('./OrganizationRegister.sol');

// TEST_ORGANIZATION ORG parameters:
const orgName = "TEST_ORGANIZATION";
const tokenName = "TestToken";
const tokenSymbol = "TST";
const founders = [web3.eth.accounts[0]];
const initRep = 10;
const initRepInWei = [web3.toWei(initRep)];
const initToken = 1000;
const initTokenInWei = [web3.toWei(initToken)];


// DAOstack parameters for universal schemes:

const votePrec = 50;

// Universal schemes fees:
const UniversalRegisterFee = web3.toWei(5);

//Deploy test organization with the following schemes:
//schemeRegistrar, upgradeScheme,globalConstraintRegistrar,simpleICO,contributionReward.
module.exports = async function(deployer) {
    deployer.deploy(GenesisScheme, {gas: constants.GENESIS_SCHEME_GAS_LIMIT}).then(async function(){
      var genesisSchemeInst = await GenesisScheme.deployed();
      // Create DAOstack:
      var returnedParams = await genesisSchemeInst.forgeOrg(orgName, tokenName, tokenSymbol, founders,
          initTokenInWei, initRepInWei);
      var AvatarInst = await Avatar.at(returnedParams.logs[0].args._avatar);
      var ControllerInst = await Controller.at(await AvatarInst.owner());
      var tokenAddress = await ControllerInst.nativeToken();
      var reputationAddress = await ControllerInst.nativeReputation();
      var DAOTokenInst = await DAOToken.at(tokenAddress);
      await deployer.deploy(AbsoluteVote);
      // Deploy AbsoluteVote:
      var AbsoluteVoteInst = await AbsoluteVote.deployed();
      // Deploy SchemeRegistrar:
      await deployer.deploy(SchemeRegistrar, tokenAddress, UniversalRegisterFee, AvatarInst.address);
      var schemeRegistrarInst = await SchemeRegistrar.deployed();
      // Deploy UniversalUpgrade:
      await deployer.deploy(UpgradeScheme, tokenAddress, UniversalRegisterFee, AvatarInst.address);
      var upgradeSchemeInst = await UpgradeScheme.deployed();
      // Deploy UniversalGCScheme register:
      await deployer.deploy(GlobalConstraintRegistrar, tokenAddress, UniversalRegisterFee, AvatarInst.address);
      var globalConstraintRegistrarInst = await GlobalConstraintRegistrar.deployed();

      await deployer.deploy(SimpleICO, tokenAddress, UniversalRegisterFee, AvatarInst.address);
      var simpleICOInst = await SimpleICO.deployed();

      await deployer.deploy(ContributionReward, tokenAddress, 0, AvatarInst.address);
      var contributionRewardInst = await ContributionReward.deployed();

      // Voting parameters and schemes params:
      var voteParametersHash = await AbsoluteVoteInst.getParametersHash(reputationAddress, votePrec, true);

      await schemeRegistrarInst.setParameters(voteParametersHash, voteParametersHash, AbsoluteVoteInst.address);
      var schemeRegisterParams = await schemeRegistrarInst.getParametersHash(voteParametersHash, voteParametersHash, AbsoluteVoteInst.address);

      await globalConstraintRegistrarInst.setParameters(reputationAddress, votePrec);
      var schemeGCRegisterParams = await globalConstraintRegistrarInst.getParametersHash(reputationAddress, votePrec);

      await upgradeSchemeInst.setParameters(voteParametersHash, AbsoluteVoteInst.address);
      var schemeUpgradeParams = await upgradeSchemeInst.getParametersHash(voteParametersHash, AbsoluteVoteInst.address);

      await simpleICOInst.setParameters(1000, 1, 1, 2, web3.eth.accounts[0], web3.eth.accounts[0]);
      var simpleICOParams = await simpleICOInst.getParametersHash(1000, 1, 1, 2, web3.eth.accounts[0], web3.eth.accounts[0]);

      await contributionRewardInst.setParameters(10, 10,voteParametersHash, AbsoluteVoteInst.address);
      var contributionRewardParams = await contributionRewardInst.getParametersHash(10, 10,voteParametersHash, AbsoluteVoteInst.address);

      // Transferring tokens to org to pay fees:
      await DAOTokenInst.transfer(AvatarInst.address, 5*UniversalRegisterFee);

      var schemesArray = [schemeRegistrarInst.address,
                          globalConstraintRegistrarInst.address,
                          upgradeSchemeInst.address,
                          simpleICOInst.address,
                          contributionRewardInst.address];
      const paramsArray = [schemeRegisterParams, schemeGCRegisterParams, schemeUpgradeParams,simpleICOParams,contributionRewardParams];
      const permissionArray = ['0x00000003', '0x00000005', '0x00000009','0x00000001','0x00000001'];
      const isUniversalArray = [true, true, true,true,true];

      // set DAOstack initial schmes:
      await genesisSchemeInst.setSchemes(
        AvatarInst.address,
        schemesArray,
        paramsArray,
        isUniversalArray,
        permissionArray);
    });
  }
