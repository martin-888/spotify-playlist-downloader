import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

dotenv.config();

const inputFile = process.env.AUDIO_FILE ?? "";
// same name but with mp3 extension
const outputFile = inputFile.replace(/\.[^/.]+$/, '.mp3');

function analyzeBitrate(inputFile: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputFile, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      if (audioStream && audioStream.bit_rate) {
        resolve(parseInt(audioStream.bit_rate));
      } else {
        reject(new Error('No audio stream found or bitrate information unavailable'));
      }
    });
  });
}

function convertMkvToMp3(inputFile: string, outputFile: string, bitrate: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .outputOptions('-vn')
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .output(outputFile)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        console.error('Error:', err);
        reject(err);
      })
      .run();
  });
}

analyzeBitrate(inputFile)
  .then(bitrate => {
    const targetBitrate = `${Math.min(320, Math.round(bitrate / 1000))}k`;
    console.log(`Bitrate: ${targetBitrate}kbps`);
    return convertMkvToMp3(inputFile, outputFile, targetBitrate);
  })
  .then(() => console.log('✅ Conversion completed'))
  .catch((error) => console.error('❌ Conversion failed:', error));