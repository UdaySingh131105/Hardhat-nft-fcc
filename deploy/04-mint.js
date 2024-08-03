const { ethers, network, deployments } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async () => {
   const { log } = deployments
   const accounts = await ethers.getSigners()
   const signer = accounts[0]
   const chainId = network.config.chainId

   // Basic Nft
   const basicNftDeployments = await deployments.get("BasicNft")
   const basicNft = await ethers.getContractAt(
      basicNftDeployments.abi,
      basicNftDeployments.address,
      signer
   )
   const basicMintTx = await basicNft.mintNFT()
   await basicMintTx.wait(1)
   console.log(`Basic NFT index 0 tokenURI: ${await basicNft.tokenURI(0)}`)
   log("----------------------------------------------------------------")

   // Random IPFS NFT
   const randomIpfsNftDeployments = await deployments.get("RandomIpfsNft")
   const randomIpfsNft = await ethers.getContractAt(
      randomIpfsNftDeployments.abi,
      randomIpfsNftDeployments.address,
      signer
   )
   const mintFee = await randomIpfsNft.getMintFee()
   await new Promise(async (resolve, reject) => {
      setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 300000) // 5 minute timeout time
      // setup listener for our event
      randomIpfsNft.once("NftMinted", async () => {
         resolve()
      })
      const randomIpfsMintTx = await randomIpfsNft.requestNft({ value: mintFee.toString() })
      const randomIpfsNftMintTxReceipt = await randomIpfsMintTx.wait(1)
      if (developmentChains.includes(network.name)) {
         const requestId = randomIpfsNftMintTxReceipt.logs[1].args.requestId.toString()
         const vrfCoordinatorV2_5MockDeployments = await deployments.get("VRFCoordinatorV2_5Mock")
         const VRFCoordinatorV2_5Mock = await ethers.getContractAt(
            vrfCoordinatorV2_5MockDeployments.abi,
            vrfCoordinatorV2_5MockDeployments.address,
            signer
         )
         await VRFCoordinatorV2_5Mock.fulfillRandomWords(requestId, randomIpfsNft.target)
      }
      console.log(`Random IPFS NFT index 0 tokenURI: ${await randomIpfsNft.tokenURI(0)}`)
   })
   log("----------------------------------------------------------------")

   // dynamic Svg NFT
   const highValue = ethers.parseEther("4000")
   const dynamicSvgNftDeployments = await deployments.get("DynamicSvgNft")
   const dynamicSvgNft = await ethers.getContractAt(
      dynamicSvgNftDeployments.abi,
      dynamicSvgNftDeployments.address,
      signer
   )
   const dynamicSvgNftTX = await dynamicSvgNft.mintNft(highValue.toString())
   await dynamicSvgNftTX.wait(1)
   console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`)
}

module.exports.tags = ["all", "mint"]
