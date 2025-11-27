import fs from "fs-extra";
import { animStrings } from "./animation-strings.js";
import { projectInfo } from "../build/1-project-bundle/projectMeta.js";
//import nodeHtmlToImage from "node-html-to-image";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch"; //If using Node.js v18+, you can use global fetch
import dotenv from "dotenv";
dotenv.config();

import pkg from "hardhat";
const { ethers, run, network } = pkg;

import puppeteer from "puppeteer";

export async function capturePreviewImagesWithPuppeteer() {
  console.log("\nCapturing preview images with Puppeteer...");
  const browser = await puppeteer.launch({
    headless: false, // Set to false for debugging, true for silent
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Do NOT use '--disable-gpu' for WebGL!
    ]
  });

  for (let i = 0; i < projectInfo.numberOfEditions; i++) {
    let tokenId = i + 1;
    let animFileName = `./build/2-anim-files/${tokenId}.html`;
    let imageFileName = `./build/3-anim-images/${tokenId}.png`;

    const page = await browser.newPage();
    await page.setViewport({ width: 700, height: 700 });

    // Load the HTML file
    await page.goto(`file://${path.resolve(animFileName)}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for rendering (increase if needed)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Optionally, check if canvas is present
    const canvasExists = await page.evaluate(() => !!document.querySelector('canvas'));
    if (!canvasExists) {
      console.warn(`No canvas found in ${animFileName}`);
    }

    // Take screenshot
    await page.screenshot({ path: imageFileName });
    console.log(`Preview image ${tokenId} was created successfully!`);

    await page.close();
  }

  await browser.close();
}

class HashSeededRandom {
    constructor(hash) {
        this.a = parseInt(hash, 16);
    }

    rand() { /* mulberry32 from https://github.com/bryc/code/blob/master/jshash/PRNGs.md */
        this.a |= 0;
        this.a = this.a + 0x6D2B79F5 | 0;
        let t = Math.imul(this.a ^ this.a >>> 15, 1 | this.a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

("use strict");

let webpackCode = "";
let finalProjectJSON = `{"project": "${projectInfo.projectName}","elements":[`;
let imageIPFS = [];
let animIPFS = [];
let finalMetaIPFS = [];
let projectMetaIPFS = "";
let contractAddress = "";
let projectImageIPFS = "";

export async function completeBuildAndDeploySequence() {
  let seq1 = [
    buildAnimationFiles,
    capturePreviewImagesWithPuppeteer,
    //// capturePreviewImages,
    pinImagesAndAnims,
    buildFinalMetaAndPinToIPFS,
    buildProjectMetaAndPinToIPFS,
    deployContract,
    buildScriptsForDatabase,
    close,
  ];
  for (const fn of seq1) await fn();
}

export async function close() {
  console.log("End of line."); // nod to "The MCP" from TRON (1982)
  process.exit();
}

export async function getIframeString(hash) {
  try {
    webpackCode = await fs.promises.readFile(
      "./build/1-project-bundle/main.js"
    );
    console.log("Webpack code successfully read.");
  } catch (err) {
    console.error(err);
  }
  let tokenString = 'let tokenData = {\n"tokenHash": "0x' + hash + '",\n';
  tokenString += `"tokenId": "ffffffffffffffff",\n`;
  tokenString += `"projectName": "test",\n`;
  tokenString += `"artistName": "tester",\n`;
  tokenString += `"properties": {"placeholder": "here"},\n`;
  tokenString += `"toData": {"placeholder": "here"}\n}\n`;
let finalString =
  "<!DOCTYPE html>\n<html>\n<head>\n<title>Test</title>\n</head>\n<body>\n<script>\n" +
  tokenString +
  "class HashSeededRandom {\nconstructor(hash) {\nthis.a = parseInt(hash, 16);\n}\nrand() {\nthis.a |= 0;\nthis.a = this.a + 0x6D2B79F5 | 0;\nlet t = Math.imul(this.a ^ this.a >>> 15, 1 | this.a);\nt = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;\nreturn ((t ^ t >>> 14) >>> 0) / 4294967296;\n}\n}\nconst hashRand = new HashSeededRandom(tokenData.tokenHash.slice(2));\nconsole.log('Token data: ',tokenData);" +
  webpackCode +
  "\n</script>\n<style>\nhtml, body {\nmargin: 0;\npadding: 0;\nheight: 100vh;\noverflow: hidden;\n}\ndiv {\nresize: both;\noverflow: auto;\n}\nh1 {\nvisibility: hidden;\n}</style>\n</body>\n</html>\n";
  return finalString;
}

export async function buildAnimationFiles() {
  console.log("\nBuilding animation files...");
  let tokenData = {
    tokenHash: "",
    tokenId: "",
    projectName: "",
    artistName: "",
    properties: "",
    toData: "",
  };

  let propertyString = '{"placeholder": "here"}'; // will be replaced later
  let toDataString = '{"placeholder": "here"}';

  for (let i = 0; i < projectInfo.numberOfEditions; i++) {
    //tokenData.tokenHash = getTokenHash();
    tokenData.tokenHash = getTokenHash(i + 1);
    tokenData.tokenId = i + 1; //getTokenId(i);
    let tokenString =
      'let tokenData = {\n"tokenHash": "0x' + tokenData.tokenHash + '",\n';
    tokenString += `"tokenId": "${tokenData.tokenId}",\n`;
    tokenString += `"projectName": "${projectInfo.projectName}",\n`;
    tokenString += `"artistName": "${projectInfo.artistName}",\n`;
    tokenString += `"properties": ${propertyString},\n`;
    tokenString += `"toData": ${toDataString}\n}\n`;
    let finalString =
      animStrings.part1 +
      projectInfo.titleForViewport +
      animStrings.part2 +
      tokenString +
      animStrings.part3 +
      webpackCode +
      animStrings.part4;
    //    console.log(finalString);
    try {
      fs.writeFileSync(
        `./build/2-anim-files/${tokenData.tokenId}.html`,
        finalString
      );
      console.log(`Animation File ${i + 1} written successfully.`);
    } catch (err) {
      console.error(err);
    }
  }
}

// export async function capturePreviewImages() {
//   console.log("\nCapturing preview images...");
//     for (let i = 0; i < projectInfo.numberOfEditions; i++) {
//     let tokenId = i + 1;
//     let animFileName = `./build/2-anim-files/${tokenId}.html`;
//     let imageFileName = `./build/3-anim-images/${tokenId}.png`;
    
//     // Read the HTML file content
//     const markup = fs.readFileSync(animFileName, "utf8");
    
//     await nodeHtmlToImage({
//       waitUntil: "domcontentloaded",
//       output: imageFileName,
//       html: markup,
//       puppeteerArgs: { 
//         defaultViewport: { width: 700, height: 700 }, 
//         headless: "new",  // Use new headless mode
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-dev-shm-usage',
//           '--disable-gpu'
//         ]
//       },
//       beforeScreenshot: async (page) => {
//         // Use the new method for waiting
//         await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
//         // Or alternatively, wait for the page to fully load
//         // await page.waitForFunction(() => document.readyState === 'complete');
//       }
//     });
    
//     console.log(`Preview image ${tokenId} was created successfully!`);
//   }
// }

// const timeout = new Promise((resolve, reject) => {
//     setTimeout(() => { resolve(5); }, 5_000);
// });

////*************NEW PINNING LOGIC*************
export async function pinFileToIPFS(filePath, metadata = {}) {
  console.log(`Pinning ${filePath} to Pinata...`);
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('pinataMetadata', JSON.stringify({
    name: metadata.name || path.basename(filePath),
    keyvalues: metadata.keyvalues || {}
  }));
  const cleanJWT = process.env.PINATA_JWT?.trim();
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanJWT}`,
      ...formData.getHeaders()
    },
    body: formData
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.details || 'Failed to pin');
  console.log(`Successfully pinned: ${result.IpfsHash}`);
  return { IpfsHash: result.IpfsHash };
}

export async function pinImagesAndAnims() {
  console.log("\nPinning animation files and preview images to IPFS...");
  let imageString = `{"images": [`;
  let animString = `{"anims": [`;
  for (let i = 0; i < projectInfo.numberOfEditions; i++) {
    let tokenId = i + 1;
    let animFileName = `./build/2-anim-files/${tokenId}.html`;

    //Pin animation file
    const animMetadata = {
      name: `${projectInfo.projectName} Animation ${tokenId}`,
      keyvalues: {
        tokenId: tokenId.toString(),
        type: "animation",
        project: projectInfo.projectName
      }
    };
    const animResult = await pinFileToIPFS(animFileName, animMetadata);
    animString += `{"token": "${tokenId}", "ipfs": "https://ipfs.io/ipfs/${animResult.IpfsHash}"}`;
    animIPFS.push(
      `{"token": "${tokenId}", "ipfs": "https://ipfs.io/ipfs/${animResult.IpfsHash}"}`
    );
    if (i < projectInfo.numberOfEditions - 1) {
      animString += `,`;
    }

    //Pin image file
    let imageFileName = `./build/3-anim-images/${tokenId}.png`;
    const imageMetadata = {
      name: `${projectInfo.projectName} Image ${tokenId}`,
      keyvalues: {
        tokenId: tokenId.toString(),
        type: "image",
        project: projectInfo.projectName
      }
    };
    const imageResult = await pinFileToIPFS(imageFileName, imageMetadata);
    imageString += `{"token": "${tokenId}", "ipfs": "https://ipfs.io/ipfs/${imageResult.IpfsHash}"}`;
    imageIPFS.push(
      `{"token": "${tokenId}", "ipfs": "https://ipfs.io/ipfs/${imageResult.IpfsHash}"}`
    );
    if (i == 0) {
      projectImageIPFS = `https://ipfs.io/ipfs/${imageResult.IpfsHash}`;
    }
    if (i < projectInfo.numberOfEditions - 1) {
      imageString += `,`;
    }
  }
  animString += `]}`;
  imageString += `]}`;
  finalProjectJSON += `${imageString},${animString},`;
  console.log(animString);
  console.log(imageString);
  console.log("Anim array:");
  console.log(...animIPFS);
  console.log("Image array:");
  console.log(...imageIPFS);
}

export async function buildFinalMetaAndPinToIPFS() {
  console.log("\nBuilding token metadata files and pinning to IPFS...");
  for (let i = 0; i < projectInfo.numberOfEditions; i++) {
    let tokenId = i + 1; //getTokenId(i);
    let finalMeta = `{\n  "image": "${
      JSON.parse(imageIPFS[i]).ipfs
    }",\n  "background_color": "96231B",\n  "external_url": "${
      projectInfo.projectWebUrl
    }",\n  "description": "${projectInfo.tokenDescriptionText}",\n  "name": "${
      projectInfo.openSeaCollectionName
    }",\n  "animation_url": "${JSON.parse(animIPFS[i]).ipfs}"\n}`;
    let finalMetaFileName = `./build/4-completed-metadata/${tokenId}.json`;
    try {
      fs.writeFileSync(finalMetaFileName, finalMeta);
      console.log(`Metafile ${i + 1} written successfully.`);
    } catch (err) {
      console.error(err);
    }
  }
  let finalMetaString = `{"metas":[`;
  for (let i = 0; i < projectInfo.numberOfEditions; i++) {
    let tokenId = i + 1; //getTokenId(i);
    let finalMetaFileName = `./build/4-completed-metadata/${tokenId}.json`;

////*************NEW PINATA CODE*************
const metadataInfo = {
  name: `${projectInfo.projectName} Metadata ${tokenId}`,
  keyvalues: {
    tokenId: tokenId.toString(),
    type: "metadata",
    project: projectInfo.projectName
  }
};
const result = await pinFileToIPFS(finalMetaFileName, metadataInfo);
finalMetaString += `{"token":"${tokenId}","ipfs":"https://ipfs.io/ipfs/${result.IpfsHash}"}`;
finalMetaIPFS.push(
  `{"token": "${tokenId}", "ipfs":  "https://ipfs.io/ipfs/${result.IpfsHash}"}`
);
if (i < projectInfo.numberOfEditions - 1) {
  finalMetaString += `,`;
}
}
finalMetaString += `]}`;
console.log(finalMetaString);
finalProjectJSON += `${finalMetaString},`;
}

export async function buildProjectMetaAndPinToIPFS() {
  console.log("\nBuilding project metadata file and pinning to IPFS...");
  let projectMetaString = `{"project-image": "${projectImageIPFS}","project-meta": `;
  let projectMeta =
    "" +
    `{"name": "${projectInfo.openSeaCollectionName}","description": "${
      projectInfo.openSeaCollectionDescription
    }","image": "${JSON.parse(imageIPFS[0]).ipfs}","external_link": "${
      projectInfo.projectWebUrl
    }","seller_fee_basis_points":"${
      projectInfo.openSeaCollectionSeller_fee_basis_points
    }","fee_recipient": "${projectInfo.openSeaCollectionFee_recipient}"}`;
  let projectMetaFileName = `./build/4-completed-metadata/${projectInfo.projectName
    .replace(/ /g, "_")
    .toLowerCase()}.json`;
  try {
    fs.writeFileSync(projectMetaFileName, projectMeta);
    console.log(`Project metadata file written successfully.`);
  } catch (err) {
    console.error(err);
  }

////***********NEW PINATA CODE***********
const projectMetadata = {
  name: `${projectInfo.projectName} Collection Metadata`,
  keyvalues: {
    type: "collection",
    project: projectInfo.projectName
  }
};
const result = await pinFileToIPFS(projectMetaFileName, projectMetadata);
projectMetaString += `"https://ipfs.io/ipfs/${result.IpfsHash}"}`;
projectMetaIPFS = `"https://ipfs.io/ipfs/${result.IpfsHash}"}`;

  finalProjectJSON += `${projectMetaString}]}`;
  let finalProjectFileName = `./build/5-final-project-data/finalProjectData.json`;
  try {
    fs.writeFileSync(finalProjectFileName, finalProjectJSON);
    console.log("Final Project summary file written to: ");
    console.log(finalProjectFileName + "\n");
  } catch (err) {
    console.error(err);
  }
  console.log(projectMetaString);
  console.log("Saved project summary file to:");
  console.log(finalProjectFileName);
}

export async function deployContract() {
  console.log("\nDeploying contract...");
  await deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

async function deploy() {
  let priceString = Math.floor(
    projectInfo.price * 10000 * 10000 * 10000 * 10000 * 100
  ).toString();
  const args = {
    mint_price: priceString,
    max_tokens: projectInfo.numberOfEditions,
    base_uri: projectMetaIPFS,
    royaltyArtist: projectInfo.openSeaCollectionFee_recipient,
    royaltyBasis: projectInfo.openSeaCollectionSeller_fee_basis_points,
  };
  const IASCreativeNFTContractFactory = await ethers.getContractFactory(
    "IASCreativeNFTContract"
  );
  // deploy
  const IASCreativeNFTContract = await IASCreativeNFTContractFactory.deploy(
    args.mint_price,
    args.max_tokens,
    args.base_uri,
    args.royaltyArtist,
    args.royaltyBasis
  );
  await IASCreativeNFTContract.waitForDeployment(
    args.mint_price,
    args.max_tokens,
    args.base_uri,
    args.royaltyArtist,
    args.royaltyBasis
  );
  console.log("Waiting for block verifications...");
  await IASCreativeNFTContract.deploymentTransaction().wait(30);
  contractAddress = await IASCreativeNFTContract.getAddress();
  console.log(`Contract deployed to ${contractAddress}`);
  // verify
  if (
    // we are on a live testnet and have the correct api key
    (network.config.chainId === 80001 && process.env.POLYGONSCAN_API_KEY) ||
    (network.config.chainId === 1115511 && process.env.ETHERSCAN_API_KEY)
  ) {
    await verify(contractAddress, [
      args.mint_price,
      args.max_tokens,
      args.base_uri,
      args.royaltyArtist,
      args.royaltyBasis,
    ]);
    console.log("Completed.");
  } else {
    console.log("No verification available for hardhat network.");
  }
}

async function verify(contractAddress, args) {
  console.log("verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("Already verified");
    } else {
      console.log(err);
    }
  }
}

export async function buildScriptsForDatabase() {
  console.log(
    "Building mySQL scripts for adding and activating project in database."
  );
  let addProjectScriptString = `INSERT INTO projects (
project_name,
img_url,
project_description,
quantity,
price_eth,
open_date_gmt,
royalty_percent,
active,
contractAddress,
summaryData
)
VALUES (
'${projectInfo.projectName}',
'${projectImageIPFS}',
'${projectInfo.websiteProjectDescription}',
${projectInfo.numberOfEditions},
${projectInfo.price},
'${projectInfo.releaseDate}',
${projectInfo.royaltiesPercent},
0,
'${contractAddress}',
'${finalProjectJSON}'
);
`;
  let addScriptFileName = `./build/5-final-project-data/addNewProject.sql`;
  fs.writeFileSync(addScriptFileName, addProjectScriptString, (err) => {
    if (err) {
      console.error(err, +" on file " + i);
    }
  });

  let activateProjectScriptString = `UPDATE projects SET active = 1 WHERE project_name = '${projectInfo.projectName}';`;
  let activateProjectScriptFileName = `./build/5-final-project-data/activateNewProject.sql`;
  fs.writeFileSync(
    activateProjectScriptFileName,
    activateProjectScriptString,
    (err) => {
      if (err) {
        console.error(err, +" on file " + i);
      }
    }
  );
  console.log("Scripts saved to:");
  console.log(addScriptFileName);
  console.log(activateProjectScriptFileName);
}


function getTokenHash(tokenId) {
    // Use tokenId as seed for deterministic hash
    // We'll create a 64-character hex string using HashSeededRandom
    const seed = tokenId.toString(16).padStart(16, '0'); // pad for consistency
    const randGen = new HashSeededRandom(seed);
    let hash = '';
    for (let i = 0; i < 64; i++) {
        hash += '0123456789abcdef'[(randGen.rand() * 16) | 0];
    }
    return hash.substring(0, 12);
}
