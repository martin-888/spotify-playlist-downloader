import dotenv from 'dotenv';
import {convertMkvToMp3} from './lib';

dotenv.config();

const outputFolder = process.env.CONVERT_OUTPUT_FOLDER ?? "";
const inputFile = process.env.AUDIO_FILE ?? "";

// Use outputFolder to create the full output file path
const outputFileName = inputFile.split('/').pop()?.replace(/\.[^/.]+$/, '.mp3') ?? '';
const outputFile = `${outputFolder}/${outputFileName}`;

convertMkvToMp3(inputFile, outputFile, "256k")
  .then(() => console.log(`✅ Conversion completed`))
  .catch((error) => console.error('❌ Conversion failed:', error));
