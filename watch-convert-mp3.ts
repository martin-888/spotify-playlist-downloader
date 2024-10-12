import dotenv from 'dotenv';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';

import {analyzeBitrate, convertMkvToMp3} from './lib';

dotenv.config();

const inputFolder = process.env.CONVERT_INPUT_FOLDER ?? "";
const outputFolder = process.env.CONVERT_OUTPUT_FOLDER ?? "";

// Function to convert file to MP3
const convertToMp3 = async (inputPath: string) => {
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputFolder, `${fileName}.mp3`);

  try {
    const bitrate = await analyzeBitrate(inputPath);
    const targetBitrate = `${Math.min(320, Math.round(bitrate / 1000))}k`;
    await convertMkvToMp3(inputPath, outputPath, targetBitrate);
    console.log(`✅ Conversion completed with ${targetBitrate} bitrate`);
  } catch (error) {
    console.error(`❌ Conversion failed:`, error);
  }
};

// Watch for new files in the input folder
const watcher = chokidar.watch(inputFolder, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true
});

watcher
  .on('add', (filePath) => {
    const fileName = path.basename(filePath);
    console.log(`🔍 New file detected: ${fileName}`);
    
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}.mp3`;
    const outputPath = path.join(outputFolder, outputFileName);

    if (fs.existsSync(outputPath)) {
      console.log(`👀 Skipping - Output file already exists`);
    } else {
      convertToMp3(filePath);
    }
  })
  .on('error', (error) => console.error(`Watcher error: ${error}`));

console.log(`Watching for new files in ${inputFolder} folder`);