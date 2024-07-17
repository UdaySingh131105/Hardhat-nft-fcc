const path = require("path")
const fs = require("fs")
const pinataSDK = require("@pinata/sdk")
require("dotenv").config()

const IMAGE_DIR_PATH = process.env.IMAGE_DIR_PATH
const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_API_SECRET = process.env.PINATA_API_SECRET

const pinata = new pinataSDK(PINATA_API_KEY, PINATA_API_SECRET)

async function storeImages() {
   const files = fs.readdirSync(IMAGE_DIR_PATH)
   console.log(files)
   let responses = []

   console.log("Uploading to IPFS...")
   for (fileIndex in files) {
      const filePath = IMAGE_DIR_PATH + "/" + files[fileIndex]
      const ReadableStreamForFiles = fs.createReadStream(filePath)

      const options = {
         pinataMetadata: {
            name: files[fileIndex],
         },
      }

      try {
         const response = await pinata.pinFileToIPFS(ReadableStreamForFiles, options)
         responses.push(response)
      } catch (error) {
         console.log(error)
      }
   }
   //    console.log(responses)
   return { responses, files }
}

async function storeTokenUriMetadata(metadata) {
   const options = {
      pinataMetadata: {
         name: metadata.name,
      },
   }
   try {
      const response = await pinata.pinJSONToIPFS(metadata, options)
      return response
   } catch (error) {
      console.log(error)
   }
   return null
}

module.exports = { storeImages, storeTokenUriMetadata }
