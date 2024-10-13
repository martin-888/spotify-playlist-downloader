import dotenv from 'dotenv';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';

import {convertMkvToMp3} from './lib';

dotenv.config();

const inputFolder = process.env.CONVERT_INPUT_FOLDER ?? "";
const outputFolder = process.env.CONVERT_OUTPUT_FOLDER ?? "";

const MAX_RETRIES = 10;
const RETRY_DELAY = 1000; // 1 seconds

// Function to check if file is locked (still being written)
const isFileLocked = async (filePath: string): Promise<boolean> => {
  try {
    const fileHandle = await fs.open(filePath, 'r+');
    await fileHandle.close();
    return false;
  } catch (error) {
    return true;
  }
};

// Function to convert file to MP3 with retries
const convertToMp3WithRetries = async (inputPath: string, retries = 0) => {
  if (retries >= MAX_RETRIES) {
    console.error(`❌ Max retries reached for ${path.basename(inputPath)}`);
    return;
  }

  if (await isFileLocked(inputPath)) {
    console.log(`⏳ File is still being written, retrying in ${RETRY_DELAY / 1000} seconds...`);
    setTimeout(() => convertToMp3WithRetries(inputPath, retries + 1), RETRY_DELAY);
    return;
  }

  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputFolder, `${fileName}.mp3`);

  return convertMkvToMp3(inputPath, outputPath, "256k")
    .then(() => console.log(`✅ Conversion completed`))
    .catch((error) => console.error('❌ Conversion failed:', error));
};

// Watch for new files in the input folder
const watcher = chokidar.watch(inputFolder, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

watcher
  .on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    console.log(`🔍 New file detected: ${fileName}`);
    
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}.mp3`;
    const outputPath = path.join(outputFolder, outputFileName);

    if (await fs.access(outputPath).then(() => true).catch(() => false)) {
      console.log(`👀 Skipping - Output file already exists`);
    } else {
      convertToMp3WithRetries(filePath);
    }
  })
  .on('error', (error) => console.error(`Watcher error: ${error}`));

console.log(`Watching for new files in ${inputFolder} folder`);
