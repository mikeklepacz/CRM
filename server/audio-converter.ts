import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegStatic!);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const ASSETS_DIR = path.join(__dirname, 'assets', 'background');
const MAX_DURATION_SECONDS = 300; // 5 minutes max
const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS = 1;
const TARGET_BIT_DEPTH = 16;

interface ConversionResult {
  fileName: string;
  filePath: string;
  duration: number;
  sampleRate: number;
}

class AudioConverter {
  async ensureAssetsDir(): Promise<void> {
    try {
      await fs.mkdir(ASSETS_DIR, { recursive: true });
    } catch (error) {
    }
  }

  async convertAndSave(buffer: Buffer, originalName: string): Promise<ConversionResult> {
    await this.ensureAssetsDir();

    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const tempInput = path.join(ASSETS_DIR, `temp_${timestamp}${ext}`);
    const outputFileName = `${baseName}_${timestamp}.wav`;
    const outputPath = path.join(ASSETS_DIR, outputFileName);

    try {
      // Write buffer to temporary file
      await fs.writeFile(tempInput, buffer);

      // Get input file metadata
      const metadata = await this.getMetadata(tempInput);
      
      if (metadata.duration > MAX_DURATION_SECONDS) {
        throw new Error(`Audio file too long. Maximum duration is ${MAX_DURATION_SECONDS} seconds.`);
      }

      // Convert to PCM 16-bit, 16kHz, mono WAV
      await this.convert(tempInput, outputPath);

      // Clean up temp file
      await fs.unlink(tempInput);

      return {
        fileName: outputFileName,
        filePath: outputPath,
        duration: metadata.duration,
        sampleRate: TARGET_SAMPLE_RATE,
      };
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(tempInput);
      } catch {}
      throw error;
    }
  }

  private getMetadata(filePath: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }
        const duration = metadata.format.duration || 0;
        resolve({ duration });
      });
    });
  }

  private convert(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(TARGET_CHANNELS)
        .audioFrequency(TARGET_SAMPLE_RATE)
        .audioBitrate('256k')
        .format('wav')
        .audioCodec('pcm_s16le') // 16-bit PCM
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  }

  async loadAudioFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error('Failed to load audio file');
    }
  }

  async deleteAudioFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
    }
  }
}

export const audioConverter = new AudioConverter();
