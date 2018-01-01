const StandardTokenMock = artifacts.require('./test/StandardTokenMock.sol');
const GenesisScheme = artifacts.require("./GenesisScheme.sol");
const UniversalSchemeMock = artifacts.require('./test/UniversalSchemeMock.sol');
 /*eslint-disable no-alert, no-console */

export class VoteInOrganizationParams {
  constructor() {
  }
}

const setup = async function (accounts,genesisScheme,founderToken=1,founderReputation=1) {
//  genesisScheme = await GenesisScheme.deployed();
  var tx = await genesisScheme.forgeOrg("testOrg","TEST","TST",[accounts[0]],[founderToken],[founderReputation]);
  assert.equal(tx.logs.length, 1);
  assert.equal(tx.logs[0].event, "NewOrg");
  return  tx.logs[0].args._avatar;
};

contract('measuremtns', function(accounts) {
    it("genesisScheme forgeOrg  ", async function() {
       var genesisScheme = await GenesisScheme.deployed();
       var tx;
       var i,j;
       var GasUsage = [];

       for  (i=0;i< accounts.length;i++){
        var founders= [];
        var foundersTokensAndReputation= [];
        for (j=0;j<i;j++){
          founders[j] =accounts[j];
          foundersTokensAndReputation[j] = j;
        }
       tx = await genesisScheme.forgeOrg("testOrg","TEST","TST",founders,foundersTokensAndReputation,foundersTokensAndReputation,{from:accounts[1]});
       GasUsage[i]= tx.receipt.gasUsed;
      }

       console.log("forgeOrg GasUsage");
       console.log("founders|gas");
       console.log("-------------------");
       for  (i=0;i< accounts.length;i++){
       console.log(i +"       |"+ GasUsage[i]);
       }
    });

    it("genesisScheme setSchemes  ", async function() {
       //console.log("txCount:" + web3.eth.getTransactionCount(accounts[0]));
       var genesisScheme = await GenesisScheme.deployed();
       //console.log("txCount after deployment:" + web3.eth.getTransactionCount(accounts[1]));
       var tx;
       var i,j;
       var GasUsageForSetScheme = [];
       var GasUsageForTransferTokens;
       var GasUsageForSchemeSetParams;
       var standardTokenMock = await StandardTokenMock.new(accounts[0], 200);

       for  (i=0;i< 10;i++){
         var schemes= [];
         var schemesToken = [];
         var isUniversal = [];
         var permissins = [];
         var params     = [];
         var avatarAddress = await setup(accounts,genesisScheme);
         tx = await standardTokenMock.transfer(avatarAddress,10);
         GasUsageForTransferTokens =  tx.receipt.gasUsed;

         var universalSchemeMock = await UniversalSchemeMock.new(standardTokenMock.address,10,accounts[1]);
         tx = await universalSchemeMock.setParameters(1,2,3,4,5,6,7,8);
         GasUsageForSchemeSetParams = tx.receipt.gasUsed;

         var paramHash = await universalSchemeMock.getParametersHash(1,2,3,4,5,6,7,8);

         for (j=0;j<i;j++){
           schemes[j] =universalSchemeMock.address;
           schemesToken[j] = standardTokenMock.address;
           isUniversal[j] = true;
           permissins[j] = "0x0000000F";
           params[j] = paramHash;
         }

       tx = await genesisScheme.setSchemes(avatarAddress,schemes,params,schemesToken,isUniversal,permissins);
       GasUsageForSetScheme[i]= tx.receipt.gasUsed;
      }
       console.log("setSchemes GasUsage table");
       console.log("schemes|setScheme|TransferTokensToAvatar|setParameters");
       console.log("------------------------------------------------------");
       for  (i=0;i< accounts.length;i++){
         if (i== 0) {
           console.log(i +"      |"+ GasUsageForSetScheme[i]+"    |"+(GasUsageForTransferTokens*i)+"                     |"+GasUsageForSchemeSetParams*i);

         }else{
           if((GasUsageForTransferTokens*i)<100000){
             console.log(i +"      |"+ GasUsageForSetScheme[i]+"   |"+(GasUsageForTransferTokens*i)+"                 |"+GasUsageForSchemeSetParams*i);

           }else{
       console.log(i +"      |"+ GasUsageForSetScheme[i]+"   |"+(GasUsageForTransferTokens*i)+"                |"+GasUsageForSchemeSetParams*i);
     }
     }
       }
    });
});
