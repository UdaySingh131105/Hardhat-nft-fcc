// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

error RandomIpfsNft__AlreadyInitialized();
error RandomIpfsNft__NeedMoreETHSent();
error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__TransferFailed();
error RandomIpfsNft__NotOwner();

contract RandomIpfsNft is VRFConsumerBaseV2Plus, ERC721 {
   // Types
   enum Breed {
      PUG,
      SHIBA_INU,
      ST_BERNARD
   }

   bytes32 private immutable i_gasLane;
   uint256 private immutable i_subscriptionId;
   uint32 private immutable i_callbackGasLimit;
   uint16 private constant MIN_REQUEST_CONFIRMATIONS = 3;
   uint32 private constant NUM_WORDS = 1;
   address private s_owner;

   // vrf helper
   mapping(uint256 => address) private s_requestIdToAddress;

   // NFT Variables
   uint256 private immutable i_mintFee;
   uint256 private s_tokenCounter;
   uint256 internal constant MAX_CHANCE_VALUE = 100;
   string[] internal s_dogTokenUris;
   bool private s_initialized;
   mapping(uint256 => string) _tokenURIs;

   // Events
   event NftRequested(uint256 indexed requestId, address indexed requester);
   event NftMinted(uint256 indexed tokenId, Breed indexed breed, address indexed minter);

   constructor(
      address _vrfCoordinator, // vrf v2.5 contract address
      bytes32 gasLane,
      uint256 susbscriptionId,
      uint32 callbackGasLimit,
      uint256 mintFee,
      string[] memory dogTokenUris
   ) VRFConsumerBaseV2Plus(_vrfCoordinator) ERC721("Random Ipfs NFT", "NIR") {
      i_gasLane = gasLane;
      i_subscriptionId = susbscriptionId;
      i_callbackGasLimit = callbackGasLimit;
      i_mintFee = mintFee;
      s_dogTokenUris = dogTokenUris;
      s_owner = msg.sender;
   }

   function requestNft() public payable returns (uint256 requestId) {
      if (msg.value < i_mintFee) {
         revert RandomIpfsNft__NeedMoreETHSent();
      }

      requestId = s_vrfCoordinator.requestRandomWords(
         VRFV2PlusClient.RandomWordsRequest({
            keyHash: i_gasLane,
            subId: i_subscriptionId,
            requestConfirmations: MIN_REQUEST_CONFIRMATIONS,
            callbackGasLimit: i_callbackGasLimit,
            numWords: NUM_WORDS,
            extraArgs: VRFV2PlusClient._argsToBytes(
               VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
            ) // new parameter in VRF 2.5
         })
      );

      s_requestIdToAddress[requestId] = msg.sender;
      emit NftRequested(requestId, msg.sender);
   }

   function fulfillRandomWords(
      uint256 _requestId,
      uint256[] calldata _randomWords
   ) internal override {
      address dogOwner = s_requestIdToAddress[_requestId];
      uint256 newItemId = s_tokenCounter;
      s_tokenCounter = s_tokenCounter + 1;
      uint256 moddedRng = _randomWords[0] % MAX_CHANCE_VALUE;
      Breed dogBreed = getBreedFromModdedRng(moddedRng);
      _safeMint(dogOwner, newItemId);
      _setTokenURI(newItemId, s_dogTokenUris[uint256(dogBreed)]);
      emit NftMinted(newItemId, dogBreed, dogOwner);
   }

   function _initializeContract(string[3] memory dogTokenUris) private {
      if (s_initialized) {
         revert RandomIpfsNft__AlreadyInitialized();
      }
      s_dogTokenUris = dogTokenUris;
      s_initialized = true;
   }

   function withdraw() public {
      if (msg.sender != s_owner) revert RandomIpfsNft__NotOwner();
      uint256 amount = address(this).balance;
      (bool success, ) = payable(msg.sender).call{value: amount}("");
      if (!success) {
         revert RandomIpfsNft__TransferFailed();
      }
   }

   function getChanceArray() public pure returns (uint256[3] memory) {
      return [10, 40, MAX_CHANCE_VALUE];
   }

   function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
      uint256 cumulativeSum = 0;
      uint256[3] memory chanceArray = getChanceArray();
      for (uint256 i = 0; i < chanceArray.length; i++) {
         // Pug = 0 - 9  (10%)
         // Shiba-inu = 10 - 39  (30%)
         // St. Bernard = 40 = 99 (60%)
         if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
            return Breed(i);
         }
         cumulativeSum = chanceArray[i];
      }
      revert RandomIpfsNft__RangeOutOfBounds();
   }

   function _setTokenURI(uint256 _tokenId, string memory _tokenURI) internal {
      _tokenURIs[_tokenId] = _tokenURI;
   }

   function getMintFee() public view returns (uint256) {
      return i_mintFee;
   }

   function getDogTokenUris(uint256 index) public view returns (string memory) {
      return s_dogTokenUris[index];
   }

   function getInitialized() public view returns (bool) {
      return s_initialized;
   }

   function getTokenCounter() public view returns (uint256) {
      return s_tokenCounter;
   }
}
