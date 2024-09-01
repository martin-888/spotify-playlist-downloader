import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

const LASTFM_API_KEY = '88654d30689c49f055b8174e1ea59b0d';

interface Track {
  id: string;
  name: string;
}

interface SpotifyDownResponse {
  success: boolean;
  metadata: {
    cache: boolean;
    success: boolean;
    id: string;
    artists: string;
    title: string;
    album: string;
    cover: string;
    isrc: string;
    releaseDate: string;
  };
  link: string;
}

function isSpotifyDownResponse(obj: any): obj is SpotifyDownResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.link === 'string' &&
    typeof obj.metadata === 'object' &&
    obj.metadata !== null
    // Add more checks for metadata properties if needed
  );
}

async function extractAndDownloadTracks(filePath: string): Promise<void> {
  try {
    // Read the HTML file
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);
    
    const tracks: Track[] = [];
    
    $('a[data-testid="internal-track-link"]').each((_, element) => {
      const href = $(element).attr('href');
      const name = $(element).text().trim();
      if (href && name) {
        const id = href.replace('/track/', '');
        tracks.push({ id, name });
      }
    });
    
    console.log(`Found ${tracks.length} tracks`);

    // Only process the first 2 tracks
    // const tracksToDownload = tracks.slice(0, 1);
    const tracksToDownload = tracks;

    for (const track of tracksToDownload) {
      await downloadTrack(track);
      // Add a 1-second delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('Error reading or parsing the file:', error);
    if (error instanceof Error) {
      console.error('Full error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

async function downloadTrack(track: Track): Promise<void> {
  const url = `https://api.spotifydown.com/download/${track.id}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9,es-BR;q=0.8,es;q=0.7,cs;q=0.6,sk;q=0.5",
        "cache-control": "no-cache",
        "dnt": "1",
        "origin": "https://spotifydown.com",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "referer": "https://spotifydown.com/",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    if (!isSpotifyDownResponse(rawData)) {
      throw new Error('Invalid response structure from API');
    }
    const data: SpotifyDownResponse = rawData;
    console.log(`Track ${track.name} download info:`, data);

    if (data.success && data.link) {
      const audioResponse = await fetch(data.link);
      if (!audioResponse.ok) {
        throw new Error(`HTTP error! status: ${audioResponse.status}`);
      }

      const buffer = await audioResponse.arrayBuffer();

      const sanitizeString = (str: string) => {
        return str
          .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
          .replace(/\s+/g, ' ')     // Replace multiple spaces with a single space
          .trim();                  // Remove leading and trailing spaces
      };

      const sanitizedTitle = sanitizeString(data.metadata.title);
      const sanitizedArtists = sanitizeString(data.metadata.artists);
      let fileName = `${sanitizedArtists} - ${sanitizedTitle}.mp3`;
      
      // Replace multiple consecutive hyphens with a single hyphen
      fileName = fileName.replace(/-+/g, '-');

      // Create 'music' folder if it doesn't exist
      const musicFolder = path.join(__dirname, 'music');
      if (!fs.existsSync(musicFolder)) {
        fs.mkdirSync(musicFolder);
      }

      const filePath = path.join(musicFolder, fileName);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`Downloaded "${data.metadata.artists} - ${data.metadata.title}" to ${filePath}`);

    } else {
      console.error(`Failed to get download link for "${track.name}"`);
    }

  } catch (error) {
    console.error(`Error downloading track ${track.name}:`, error);
    if (error instanceof Error) {
      console.error('Full error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Usage example
const filePath = path.join(__dirname, 'website.html');
extractAndDownloadTracks(filePath);