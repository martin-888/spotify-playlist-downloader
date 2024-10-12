import dotenv from 'dotenv';
import {analyzeBitrate, convertMkvToMp3} from './lib';

dotenv.config();

const outputFolder = process.env.CONVERT_OUTPUT_FOLDER ?? "";
const inputFile = process.env.AUDIO_FILE ?? "";

// Use outputFolder to create the full output file path
const outputFileName = inputFile.split('/').pop()?.replace(/\.[^/.]+$/, '.mp3') ?? '';
const outputFile = `${outputFolder}/${outputFileName}`;

analyzeBitrate(inputFile)
  .then(bitrate => {
    const targetBitrate = `${Math.min(320, Math.round(bitrate / 1000))}k`;
    return convertMkvToMp3(inputFile, outputFile, targetBitrate)
      .then(() => console.log(`✅ Conversion completed with ${targetBitrate} bitrate`))
  })
  .catch((error) => console.error('❌ Conversion failed:', error));
