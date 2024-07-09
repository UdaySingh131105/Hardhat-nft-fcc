const { deployments, ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function () {
   const { deploy, log } = deployments
   const accounts = await ethers.getSigners()
   const signer = accounts[0]

   const _args = []
   log("-----------------------------------------------")

   const basicNFT = await deploy("BasicNft", {
      from: signer.address,
      args: _args,
      log: true,
      //   waitConfirmations: network.config.blockConfimations || 1,
   })
   log("-----------------------------------------------")

   if (!developmentChains.includes(network.name)) {
      console.log("Verifying...")
      await verify(basicNFT.address, _args)
   }
}

module.exports.tags = ["all", "basicnft", "main"]
