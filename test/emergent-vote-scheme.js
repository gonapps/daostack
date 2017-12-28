const helpers = require('./helpers');
const EmergentVoteScheme = artifacts.require('./EmergentVoteScheme.sol');
const StandardTokenMock = artifacts.require('./StandardTokenMock.sol');

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

    it('setProposalParameters valid and invalid params', async ()=>{
        const token = await StandardTokenMock.new(accounts[0],10);
        const scheme = await EmergentVoteScheme.new(token.address,10,accounts[1]);

        const goodExample = {
            percent: 20,
            quorum: 30,
            boost: 3
        };

        await scheme.setProposalParameters(
            goodExample.percent,
            goodExample.quorum,
            goodExample.boost);

        const badExamples = [
            {percent: -Math.round(Math.random()*100)}, // negative
            {percent: 101 + Math.round(Math.random()*100)}, // above 100%
            {percent: 0}, // corner case

            {quorum: -Math.round(Math.random()*100)}, // negative
            {quorum: 101 + Math.round(Math.random()*100)}, // above 100%
            {quorum: 0}, // corner case
        ].map(o => Object.assign({},goodExample,o));

        for(let i = 0 ; i < badExamples.length ; i++){
            const example = badExamples[i];
            try{
                await scheme.setProposalParameters(example.percent,example.quorum,example.boost);
                assert(false, 'Should fail due to out-of-range param. Params were: ' + JSON.stringify(example,undefined,2));
            }
            catch(e){
                helpers.assertVMException(e);
            } 
        } 
    });
});