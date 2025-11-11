import fs from "fs-extra";
import { animStrings } from "./animation-strings.js";
import { projectInfo } from "../build/1-project-bundle/projectMeta.js";
import nodeHtmlToImage from "node-html-to-image";
import dotenv from "dotenv";
dotenv.config();
import pinataSDK from "@pinata/sdk";
const pinata = new pinataSDK(
  process.env.pinata_api_key,
  process.env.pinata_secret_api_key
);
import pkg from "hardhat";
const { ethers, run, network } = pkg;

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
    capturePreviewImages,
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