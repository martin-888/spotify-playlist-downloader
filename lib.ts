import ffmpeg from 'fluent-ffmpeg';

export function analyzeBitrate(inputFile: string): Promise<number> {
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

export function convertMkvToMp3(inputFile: string, outputFile: string, bitrate: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .outputOptions('-vn')
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .output(outputFile)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
