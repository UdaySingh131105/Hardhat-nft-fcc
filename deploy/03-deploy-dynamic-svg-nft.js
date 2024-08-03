const { deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function () {
   const { deploy, log } = deployments
   const accounts = await ethers.getSigners()
   const signer = accounts[0]
   const chainId = network.config.chainId
   let ethUsdPriceFeedAddress

   if (developmentChains.includes(network.name)) {
      const EthUsdAggregator = await deployments.get("MockV3Aggregator")
      ethUsdPriceFeedAddress = EthUsdAggregator.address
   } else {
      ethUsdPriceFeedAddress = networkConfig[chainId].ETH_USD_PriceFeed
   }

   const lowSVG = fs.readFileSync("./images/DynamicNftImages/frown.svg", { encoding: "utf8" })
   const highSVG = fs.readFileSync("./images/DynamicNftImages/happy.svg", { encoding: "utf8" })

   // console.log("lowSvg ", lowSVG)
   // console.log("high", highSVG)

   log("--------------------------------------------------------------------------")

   const _args = [ethUsdPriceFeedAddress, lowSVG, highSVG]

   const dynamicSvgNft = await deploy("DynamicSvgNft", {
      from: signer.address,
      log: true,
      args: _args,
   })

   log("-------------------------------------------------------------")

   if (!developmentChains.includes(network.name)) {
      console.log("Verifying...")
      await verify(dynamicSvgNft.address, _args)
   }
}

module.exports.tags = ["all", "dynamicsvg", "main"]
