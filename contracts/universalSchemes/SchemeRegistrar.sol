pragma solidity ^0.4.18;

import "../VotingMachines/IntVoteInterface.sol";
import "./UniversalScheme.sol";


/**
 * @title A registrar for Schemes for organizations
 * @dev The SchemeRegistrar is used for registering and unregistering schemes at organizations
 */

contract SchemeRegistrar is UniversalScheme {
    event LogNewSchemeProposal(
        address indexed _avatar,
        bytes32 indexed _proposalId,
        address indexed _intVoteInterface,
        address _scheme,
        bytes32 _parametersHash,
        bool _isRegistering,
        StandardToken _tokenFee,
        uint _fee,
        bool _autoRegisterOrganization
    );
    event LogRemoveSchemeProposal(address indexed _avatar,
        bytes32 indexed _proposalId,
        address indexed _intVoteInterface,
        address _scheme
    );
    event LogProposalExecuted(address indexed _avatar, bytes32 indexed _proposalId);
    event LogProposalDeleted(address indexed _avatar, bytes32 indexed _proposalId);

    // a SchemeProposal is a  proposal to add or remove a scheme to/from the an orgaization
    struct SchemeProposal {
        address scheme; //
        bytes32 parametersHash;
        uint proposalType; // 1: add a schme, 2: remove a scheme.
        bool isRegistering;
        StandardToken tokenFee;
        uint fee;
        bool autoRegisterOrganization;
    }

    // A mapping from thr organization (Avatar) address to the saved data of the organization:
    mapping(address=>mapping(bytes32=>SchemeProposal)) public organizationsProposals;

    // A mapping from hashes to parameters (use to store a particular configuration on the controller)
    struct Parameters {
        bytes32 voteRegisterParams;
        bytes32 voteRemoveParams;
        IntVoteInterface intVote;
    }
    mapping(bytes32=>Parameters) public parameters;

    /**
    * @dev The constructor
    * @param _nativeToken a Token that is used for paying fees for registering
    * @param _fee the fee to pay
    * @param _beneficiary to whom the fee is payed
    */
    function SchemeRegistrar(StandardToken _nativeToken, uint _fee, address _beneficiary) public {
        updateParameters(_nativeToken, _fee, _beneficiary, bytes32(0));
    }

    /**
    * @dev hash the parameters, save them if necessary, and return the hash value
    */
    function setParameters(
        bytes32 _voteRegisterParams,
        bytes32 _voteRemoveParams,
        IntVoteInterface _intVote
    ) public returns(bytes32)
    {
        bytes32 paramsHash = getParametersHash(_voteRegisterParams, _voteRemoveParams, _intVote);
        parameters[paramsHash].voteRegisterParams = _voteRegisterParams;
        parameters[paramsHash].voteRemoveParams = _voteRemoveParams;
        parameters[paramsHash].intVote = _intVote;
        return paramsHash;
    }

    function getParametersHash(
        bytes32 _voteRegisterParams,
        bytes32 _voteRemoveParams,
        IntVoteInterface _intVote
    ) public pure returns(bytes32)
    {
        return keccak256(_voteRegisterParams, _voteRemoveParams, _intVote);
    }

    /**
    * @dev create a proposal to register a scheme
    * @param _scheme the address of the scheme to be registered
    * @param _parametersHash a hash of the configuration of the _scheme
    * @param _isRegistering a boolean represent if the scheme is a registering scheme
    *      that can register other schemes
    * @param _tokenFee a token that will be used to pay any fees needed for registering the avatar
    * @param _fee the fee to be paid
    * @param _avatar the address of the organization the scheme will be registered for
    * @return a proposal Id
    * @dev NB: not only proposes the vote, but also votes for it
    */
    // TODO: check if we cannot derive isRegistering from the _scheme itself
    // TODO: simplify this by removing the _tokenFee and fee params, which can be derived from
    // the scheme (i.e. are equal to _scheme.fee() and scheme.somethingToken())
    function proposeScheme(
        Avatar _avatar,
        address _scheme,
        bytes32 _parametersHash,
        bool _isRegistering,
        StandardToken _tokenFee,
        uint _fee,
        bool _autoRegisterOrganization
    )
    public
    onlyRegisteredOrganization(_avatar)
    returns(bytes32)
    {
        if (_autoRegisterOrganization) {
            //This should revert for non arc scheme which do not have Fallback functions.
            //We do it here to prevent revert at the proposal execution after the voting proccess.
            UniversalScheme(_scheme).isRegistered(Avatar(_avatar));
        }
        // propose
        Parameters memory controllerParams = parameters[getParametersFromController(_avatar)];

        bytes32 proposalId = controllerParams.intVote.propose(2, controllerParams.voteRegisterParams, _avatar, ExecutableInterface(this));

        SchemeProposal memory proposal = SchemeProposal({
            scheme: _scheme,
            parametersHash: _parametersHash,
            proposalType: 1,
            isRegistering: _isRegistering,
            tokenFee: _tokenFee,
            fee: _fee,
            autoRegisterOrganization: _autoRegisterOrganization
        });
        LogNewSchemeProposal(
            _avatar,
            proposalId,
            controllerParams.intVote,
            _scheme, _parametersHash,
            _isRegistering,
            _tokenFee,
            _fee,
            _autoRegisterOrganization
        );
        organizationsProposals[_avatar][proposalId] = proposal;

        // vote for this proposal
        controllerParams.intVote.ownerVote(proposalId, 1, msg.sender); // Automatically votes `yes` in the name of the opener.
        return proposalId;
    }

    /**
    * @dev propose to remove a scheme for a controller
    * @param _avatar the address of the controller from which we want to remove a scheme
    * @param _scheme the address of the scheme we want to remove
    *
    * NB: not only registers the proposal, but also votes for it
    */
    function proposeToRemoveScheme(Avatar _avatar, address _scheme)
    public
    onlyRegisteredOrganization(_avatar)
    returns(bytes32)
    {
        bytes32 paramsHash = getParametersFromController(_avatar);
        Parameters memory params = parameters[paramsHash];

        IntVoteInterface intVote = params.intVote;
        bytes32 proposalId = intVote.propose(2, params.voteRemoveParams, _avatar, ExecutableInterface(this));
        
        organizationsProposals[_avatar][proposalId].proposalType = 2;
        organizationsProposals[_avatar][proposalId].scheme = _scheme;
        LogRemoveSchemeProposal(_avatar, proposalId, intVote, _scheme);
        // vote for this proposal
        intVote.ownerVote(proposalId, 1, msg.sender); // Automatically votes `yes` in the name of the opener.
        return proposalId;
    }

    /**
    * @dev execute a  proposal
    * This method can only be called by the voting machine in which the vote is held.
    * @param _proposalId the ID of the proposal in the voting machine
    * @param _avatar address of the controller
    * @param _param identifies the action to be taken
    */
    // TODO: this call can be simplified if we save the _avatar together with the proposal
    function execute(bytes32 _proposalId, address _avatar, int _param) external returns(bool) {
        // Check the caller is indeed the voting machine:
        require(parameters[getParametersFromController(Avatar(_avatar))].intVote == msg.sender);

        if (_param == 1) {

        // Define controller and get the parmas:
            Controller controller = Controller(Avatar(_avatar).owner());
            SchemeProposal memory proposal = organizationsProposals[_avatar][_proposalId];

        // Add a scheme:
            if (proposal.proposalType == 1) {
                if (proposal.fee != 0) {
                    if (!controller.externalTokenIncreaseApproval(proposal.tokenFee, proposal.scheme, proposal.fee)) {
                        revert();
                      }
                    }
                if (proposal.isRegistering == false) {
                    if (!controller.registerScheme(proposal.scheme, proposal.parametersHash, bytes4(1))) {
                        revert();
                      }
                      } else {
                    if (!controller.registerScheme(proposal.scheme, proposal.parametersHash, bytes4(3))) {
                        revert();
                    }
                }
                if (proposal.autoRegisterOrganization) {
                    UniversalScheme(proposal.scheme).registerOrganization(Avatar(_avatar));
                  }
                }
        // Remove a scheme:
            if ( proposal.proposalType == 2 ) {
                if (!controller.unregisterScheme(proposal.scheme)) {
                    revert();
                  }
                }
          }
        delete organizationsProposals[_avatar][_proposalId];
        LogProposalExecuted(_avatar, _proposalId);
        return true;
    }
}
