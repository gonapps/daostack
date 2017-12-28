const helpers = require('./helpers');
const Reputation = artifacts.require('./Reputation.sol');
const EmergentVoteScheme = artifacts.require('./EmergentVoteScheme.sol');
const StandardTokenMock = artifacts.require('./StandardTokenMock.sol');
const ExecutableTest = artifacts.require('./ExecutableTest.sol');

contract('EmergentVoteScheme', (accounts)=>{
    it('constructor should update params',async ()=>{
        const token = await StandardTokenMock.new(accounts[0],10);
        const scheme = await EmergentVoteScheme.new(token.address,10,accounts[0]);

        const nativeToken = await scheme.nativeToken();
        const fee = await scheme.fee();
        const beneficiary = await scheme.beneficiary();
        const hashedParameters = await scheme.hashedParameters();

        assert.equal(nativeToken, token.address);
        assert.equal(fee, 10);
        assert.equal(beneficiary, accounts[0]);
        assert.equal(hashedParameters, 0);
    });
    
    it('setProposalParameters param range', async ()=>{
        const token = await StandardTokenMock.new(accounts[0],10);
        const scheme = await EmergentVoteScheme.new(token.address,10,accounts[1]);

        const examples = {
            bad: {
                percent: [
                    -Math.round(Math.random()*100), // A negative number
                    101 + Math.round(Math.random()*100), // Above 100%
                    0 // corner case
                ],
                quorum: [
                    -Math.round(Math.random()*100), // A negative number
                    101 + Math.round(Math.random()*100), // Above 100%
                    0 // corner case
                ]
            }
        };

        for(let i = 0 ; i < examples.bad.percent.length ; i++){
            const percent = examples.bad.percent[i];
            try{
                await scheme.setProposalParameters(percent,Math.round(Math.random()*100),3);
                assert(false, 'Should fail due to out-of-range percent');
            }
            catch(e){
                helpers.assertVMException(e);
            } 
        }  
        for(let i = 0 ; i < examples.bad.quorum.length ; i++){
            const quorum = examples.bad.quorum[i];
            try{
                await scheme.setProposalParameters(Math.round(Math.random()*100),quorum,3);
                assert(false, 'Should fail due to out-of-range quorum');
            }
            catch(e){
                helpers.assertVMException(e);
            } 
        }    
    });

});