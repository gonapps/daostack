const helpers = require('./helpers');
import { getValueFromLogs } from './helpers';

const EmergentVoteScheme = artifacts.require("./EmergentVoteScheme.sol");
const Reputation = artifacts.require("./Reputation.sol");
const Avatar = artifacts.require("./Avatar.sol");
const ExecutableTest = artifacts.require("./ExecutableTest.sol");
const StandardTokenMock = artifacts.require('./test/StandardTokenMock.sol');
const GenesisScheme = artifacts.require("./GenesisScheme.sol");



export class EmergentVoteSchemeParams {
  constructor() {
  }
}

const setupEmergentVoteSchemeParams = async function(
                                            testSetup,
                                            beneficiary,
                                            attentionBandwidth = 0,
                                            minBoostTimeFrame = 0,
                                            maxBoostTimeFrame = 0,
                                            minBoost = 0,
                                            allowOwner = true
                                            ) {
  var emergentVoteSchemeParams = new EmergentVoteSchemeParams();

  await testSetup.emergentVoteScheme.setOrgParameters(testSetup.org.reputation.address,
                                                      testSetup.standardTokenMock.address,
                                                      beneficiary,
                                                      attentionBandwidth,
                                                      minBoostTimeFrame,
                                                      maxBoostTimeFrame,
                                                      minBoost,
                                                      allowOwner);
  emergentVoteSchemeParams.paramsHash = await testSetup.emergentVoteScheme.getOrgParametersHash(testSetup.org.reputation.address,
                                                                                   testSetup.standardTokenMock.address,
                                                                                   beneficiary,
                                                                                   attentionBandwidth,
                                                                                   minBoostTimeFrame,
                                                                                   maxBoostTimeFrame,
                                                                                   minBoost,
                                                                                   allowOwner);
  return emergentVoteSchemeParams;
};

const setup = async function (accounts,
                              attentionBandwidth = 0,
                              minBoostTimeFrame = 0,
                              maxBoostTimeFrame = 0,
                              minBoost = 0,
                              allowOwner = true) {

   var testSetup = new helpers.TestSetup();
   testSetup.fee = 10;
   testSetup.standardTokenMock = await StandardTokenMock.new(accounts[1],100);
   testSetup.emergentVoteScheme = await EmergentVoteScheme.new(testSetup.standardTokenMock.address,testSetup.fee,accounts[0]);
   testSetup.genesisScheme = await GenesisScheme.deployed();
   testSetup.org = await helpers.setupOrganization(testSetup.genesisScheme,accounts[0],1000,1000);
   testSetup.emergentVoteSchemeParams= await setupEmergentVoteSchemeParams(testSetup,
                                                                           accounts[1],
                                                                           attentionBandwidth,
                                                                           minBoostTimeFrame,
                                                                           maxBoostTimeFrame,
                                                                           minBoost,
                                                                           allowOwner);
   await testSetup.genesisScheme.setSchemes(testSetup.org.avatar.address,[testSetup.emergentVoteScheme.address],[testSetup.emergentVoteSchemeParams.paramsHash],[testSetup.standardTokenMock.address],[100],["0x0000000F"]);
   //give some tokens to organization avatar so it could register the univeral scheme.
   await testSetup.standardTokenMock.transfer(testSetup.org.avatar.address,30,{from:accounts[1]});
   testSetup.executable = await ExecutableTest.new();
   return testSetup;
};

const checkProposalInfo = async function(proposalId, _proposalInfo) {
  let proposalInfo;
  proposalInfo = await emergentVote.proposals(proposalId);
  //console.log("proposalInfo: " + proposalInfo);
  // proposalInfo has the following structure
  // address owner;
  assert.equal(proposalInfo[0], _proposalInfo[0]);
  // address avatar;
  assert.equal(proposalInfo[1], _proposalInfo[1]);
  // uint numOfChoices;
  assert.equal(proposalInfo[2], _proposalInfo[2]);
  // ExecutableInterface executable;
  assert.equal(proposalInfo[3], _proposalInfo[3]);
  // bytes32 paramsHash;
  assert.equal(proposalInfo[4], _proposalInfo[4]);
  // uint totalVotes;
  assert.equal(proposalInfo[5], _proposalInfo[5]);
  // - the mapping is simply not returned at all in the array
  // bool opened; // voting opened flag
  assert.equal(proposalInfo[6], _proposalInfo[6]);
};

const checkVotesStatus = async function(proposalId, _votesStatus){
  let votesStatus;
  votesStatus = await emergentVote.votesStatus(proposalId);
  //console.log("ProposalStatus: " + votesStatus);
  // uint Option 1
  assert.equal(votesStatus[0], _votesStatus[0]);
  // uint Option 2
  assert.equal(votesStatus[1], _votesStatus[1]);
  // uint Option 3
  assert.equal(votesStatus[2], _votesStatus[2]);
  // uint Option 4
  assert.equal(votesStatus[3], _votesStatus[3]);
  // uint Option 5
  assert.equal(votesStatus[4], _votesStatus[4]);
  // uint Option 6
  assert.equal(votesStatus[5], _votesStatus[5]);
  // uint Option 7
  assert.equal(votesStatus[6], _votesStatus[6]);
  // uint Option 8
  assert.equal(votesStatus[7], _votesStatus[7]);
  // uint Option 9
  assert.equal(votesStatus[8], _votesStatus[8]);
  // uint Option 10
  assert.equal(votesStatus[9], _votesStatus[9]);
};

const checkVoteInfo = async function(proposalId, voterAddress, _voteInfo) {
  let voteInfo;
  voteInfo = await emergentVote.voteInfo(proposalId, voterAddress);
  // voteInfo has the following structure
  // int vote;
  assert.equal(voteInfo[0], _voteInfo[0]);
  // uint reputation;
  assert.equal(voteInfo[1], _voteInfo[1]);
};

contract('EmergentVote', function (accounts) {

  it("constructor", async function() {
    var standardTokenMock = await StandardTokenMock.new(accounts[0],100);
    var emergentVote = await EmergentVoteScheme.new(standardTokenMock.address,10,accounts[1]);
    var token = await emergentVote.nativeToken();
    assert.equal(token,standardTokenMock.address);
    var fee = await emergentVote.fee();
    assert.equal(fee,10);
    var beneficiary = await emergentVote.beneficiary();
    assert.equal(beneficiary,accounts[1]);
   });

   it("setOrgParameters", async function() {
     var standardTokenMock = await StandardTokenMock.new(accounts[0],100);
     var emergentVote = await EmergentVoteScheme.new(standardTokenMock.address,10,accounts[1]);
     await emergentVote.setOrgParameters(accounts[0],standardTokenMock.address,accounts[1],100,0,0,0,true);
     var paramHash = await emergentVote.getOrgParametersHash(accounts[0],standardTokenMock.address,accounts[1],100,0,0,0,true);
     var parameters = await emergentVote.organizationsParameters(paramHash);
     assert.equal(parameters[1],standardTokenMock.address);
     });

     it("setProposalParameters", async function() {
       var standardTokenMock = await StandardTokenMock.new(accounts[0],100);
       var emergentVote = await EmergentVoteScheme.new(standardTokenMock.address,10,accounts[1]);
       await emergentVote.setProposalParameters(10, 10, 10);
       var paramHash = await emergentVote.getProposalParametersHash(10, 10, 10);
       var parameters = await emergentVote.proposalsParameters(paramHash);
       assert.equal(parameters[0],10);
       assert.equal(parameters[1],10);
       assert.equal(parameters[2],10);
       });

       it("setProposalParameters require(_precReq <= 100 && _precReq > 0);", async function() {
         var _precReq = 0;

         var standardTokenMock = await StandardTokenMock.new(accounts[0],100);
         var emergentVote = await EmergentVoteScheme.new(standardTokenMock.address,10,accounts[1]);
         try{
         await emergentVote.setProposalParameters(_precReq, 10, 10);
         assert(false,"setProposalParameters should  fail -_precReq = 0 !");
         }catch(ex){
          helpers.assertVMException(ex);
         }
         });

         it("setProposalParameters require(_quorum <= 100 && _quorum > 0);", async function() {
           var _precReq = 1;
           var _quorum = 0;

           var standardTokenMock = await StandardTokenMock.new(accounts[0],100);
           var emergentVote = await EmergentVoteScheme.new(standardTokenMock.address,10,accounts[1]);
           try{
           await emergentVote.setProposalParameters(_precReq, _quorum, 10);
           assert(false,"setProposalParameters should  fail -_precReq = 0 !");
           }catch(ex){
            helpers.assertVMException(ex);
           }
           });

    it("registerOrganization - check fee payment ", async function() {
      var testSetup = await setup(accounts);
      await testSetup.emergentVoteScheme.registerOrganization(testSetup.org.avatar.address);
      var balanceOfBeneficiary  = await testSetup.standardTokenMock.balanceOf(accounts[0]);
      assert.equal(balanceOfBeneficiary.toNumber(),testSetup.fee);
     });

  it("propose", async function () {
    var _precReq = 1;
    var _quorum = 1;
    var _boostTimeFrame = 0;
    var _numberOfChoice = 5;
    var testSetup = await setup(accounts);
    await testSetup.emergentVoteScheme.registerOrganization(testSetup.org.avatar.address);
    await testSetup.emergentVoteScheme.setProposalParameters(_precReq, _quorum, _boostTimeFrame);
    var paramHash = await testSetup.emergentVoteScheme.getProposalParametersHash(_precReq, _quorum, _boostTimeFrame);
    var tx = await testSetup.emergentVoteScheme.propose(_numberOfChoice, paramHash,testSetup.org.avatar.address, testSetup.executable.address);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    assert.isOk(proposalId);
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "NewProposal");
  });

  it("propose without registration ", async function () {
    var _precReq = 1;
    var _quorum = 1;
    var _boostTimeFrame = 0;
    var _numberOfChoice = 5;
    var testSetup = await setup(accounts);
    await testSetup.emergentVoteScheme.setProposalParameters(_precReq, _quorum, _boostTimeFrame);
    var paramHash = await testSetup.emergentVoteScheme.getProposalParametersHash(_precReq, _quorum, _boostTimeFrame);
    try {
    await testSetup.emergentVoteScheme.propose(_numberOfChoice, paramHash,testSetup.org.avatar.address, testSetup.executable.address);
    assert(false,"propose should  fail -no registrations !");
    }catch(ex){
     helpers.assertVMException(ex);
   }
  });

  it("propose with  _numberOfChoice > MAX_NUM_OF_CHOICES ", async function () {
    var _precReq = 1;
    var _quorum = 1;
    var _boostTimeFrame = 0;
    var _numberOfChoice = 11;
    var testSetup = await setup(accounts);
    await testSetup.emergentVoteScheme.registerOrganization(testSetup.org.avatar.address);
    await testSetup.emergentVoteScheme.setProposalParameters(_precReq, _quorum, _boostTimeFrame);
    var paramHash = await testSetup.emergentVoteScheme.getProposalParametersHash(_precReq, _quorum, _boostTimeFrame);
    try {
    await testSetup.emergentVoteScheme.propose(_numberOfChoice, paramHash,testSetup.org.avatar.address, testSetup.executable.address);
    assert(false,"propose should  fail -_numberOfChoice > MAX_NUM_OF_CHOICES !");
    }catch(ex){
     helpers.assertVMException(ex);
   }
  });

  it("cancel proposal owner not allowed", async function () {
    var _precReq = 1;
    var _quorum = 1;
    var _boostTimeFrame = 0;
    var _numberOfChoice = 5;
    var testSetup = await setup(accounts,0,0,0,0,false);
    await testSetup.emergentVoteScheme.registerOrganization(testSetup.org.avatar.address);
    await testSetup.emergentVoteScheme.setProposalParameters(_precReq, _quorum, _boostTimeFrame);
    var paramHash = await testSetup.emergentVoteScheme.getProposalParametersHash(_precReq, _quorum, _boostTimeFrame);
    var tx = await testSetup.emergentVoteScheme.propose(_numberOfChoice, paramHash,testSetup.org.avatar.address, testSetup.executable.address);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    tx = await testSetup.emergentVoteScheme.cancelProposal(proposalId);
    assert.equal(tx.logs.length, 0);
  });

  it("cancel proposal check only proposal owner", async function () {
    var _precReq = 1;
    var _quorum = 1;
    var _boostTimeFrame = 0;
    var _numberOfChoice = 5;
    var testSetup = await setup(accounts,0,0,0,0,false);
    await testSetup.emergentVoteScheme.registerOrganization(testSetup.org.avatar.address);
    await testSetup.emergentVoteScheme.setProposalParameters(_precReq, _quorum, _boostTimeFrame);
    var paramHash = await testSetup.emergentVoteScheme.getProposalParametersHash(_precReq, _quorum, _boostTimeFrame);
    var tx = await testSetup.emergentVoteScheme.propose(_numberOfChoice, paramHash,testSetup.org.avatar.address, testSetup.executable.address);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    try {
     await testSetup.emergentVoteScheme.cancelProposal(proposalId,{from:accounts[1]});
     assert(false,"cancel should  fail -wrong proposal owner");
     }catch(ex){
      helpers.assertVMException(ex);
    }
  });

  it("cancel proposal", async function () {
    var _precReq = 1;
    var _quorum = 1;
    var _boostTimeFrame = 0;
    var _numberOfChoice = 5;
    var testSetup = await setup(accounts);
    await testSetup.emergentVoteScheme.registerOrganization(testSetup.org.avatar.address);
    await testSetup.emergentVoteScheme.setProposalParameters(_precReq, _quorum, _boostTimeFrame);
    var paramHash = await testSetup.emergentVoteScheme.getProposalParametersHash(_precReq, _quorum, _boostTimeFrame);
    var tx = await testSetup.emergentVoteScheme.propose(_numberOfChoice, paramHash,testSetup.org.avatar.address, testSetup.executable.address);
    const proposalId = await getValueFromLogs(tx, '_proposalId');
    var proposals = await testSetup.emergentVoteScheme.proposals(proposalId);
    assert.equal(proposals[1],testSetup.org.avatar.address);
    tx = await testSetup.emergentVoteScheme.cancelProposal(proposalId);
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "CancelProposal");
    proposals = await testSetup.emergentVoteScheme.proposals(proposalId);
    assert.equal(proposals[1],0x0000000000000000000000000000000000000000);
  });
});
