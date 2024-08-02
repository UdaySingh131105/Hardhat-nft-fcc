const { deployments, ethers, network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToIPFS")

// fund amount for mock vrf subscription
const _FUND_AMMOUNT = ethers.parseEther("500")

const metadataTemplate = {
   name: "",
   description: "",
   image: "",
   attributes: [
      {
         trait_type: "Cuteness",
         value: 100,
      },
   ],
}

module.exports = async () => {
   const { deploy, log } = deployments
   const accounts = await ethers.getSigners()
   const signer = accounts[0]
   const chainId = network.config.chainId
   let tokenUris

   if (process.env.UPLOAD_TO_PINATA == "true") {
      tokenUris = await handleTokenUris()
   } else {
      tokenUris = [
         "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
         "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
         "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
      ]
   }

   let VRFCoordinatorV2_5Mock, _mockAddress, _subscriptionId

   if (developmentChains.includes(network.name)) {
      // if on local network
      const vrfCoordinatorDeployments = await deployments.get("VRFCoordinatorV2_5Mock")

      VRFCoordinatorV2_5Mock = await ethers.getContractAt(
         vrfCoordinatorDeployments.abi,
         vrfCoordinatorDeployments.address,
         signer
      )
      _mockAddress = VRFCoordinatorV2_5Mock.target

      // creating a subscription
      const txResponse = await VRFCoordinatorV2_5Mock.createSubscription()
      const txReciept = await txResponse.wait(1)

      _subscriptionId = txReciept.logs[0].args.subId

      // funding the subscription created
      const fundResponse = await VRFCoordinatorV2_5Mock.fundSubscription(
         _subscriptionId,
         _FUND_AMMOUNT
      )
      const fundReciept = await fundResponse.wait(1)

      /**used these for debugging events (fundsubscription event - SubscriptionFunded in mocks)
       * SubscriptionFunded Event
       * console.log(fundReciept.logs[0].args.subId)
       * console.log(fundReciept.logs[0].args.oldBalance)
       * console.log(fundReciept.logs[0].args.newBalance)
       */

      log("-------------------------------------------------------------")
   } else {
      // when on testnet or mainnet.
      _mockAddress = networkConfig[chainId].vrfCoordinatorAddress
      _subscriptionId = networkConfig[chainId].subscriptionId
   }

   const _gasLane = networkConfig[chainId].keyHash
   const _callBackGasLimit = networkConfig[chainId].callBackGasLimit
   const _mintFee = networkConfig[chainId].mintFee

   const _args = [_mockAddress, _gasLane, _subscriptionId, _callBackGasLimit, _mintFee, tokenUris]

   const randomIpfsNft = await deploy("RandomIpfsNft", {
      from: signer.address,
      log: true,
      args: _args,
   })

   log("-------------------------------------------------------------")
   if (developmentChains.includes(network.name)) {
      const response = await VRFCoordinatorV2_5Mock.addConsumer(
         _subscriptionId,
         randomIpfsNft.address
      )
      await response.wait(1)

      log(`consumer Added`)
   }

   if (!developmentChains.includes(network.name)) {
      console.log("Verifying...")
      await verify(randomIpfsNft.address, _args)
   }
}

async function handleTokenUris() {
   let tokenUris = []
   // store the image in ipfs
   const { responses: imageUploadResponses, files } = await storeImages()

   for (const imageUploadResponseIndex in imageUploadResponses) {
      let tokenUriMetadata = { ...metadataTemplate }
      tokenUriMetadata.name = files[imageUploadResponseIndex].replace(/\b.png|\b.jpg|\b.jpeg/, "")
      tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
      tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`

      // store metadata in ipfs
      console.log(`Uploading ${tokenUriMetadata.name}...`)
      const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
      tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
   }

   return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
