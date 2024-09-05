import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const playlistIdOrUrl = process.env.PLAYLIST_ID_OR_URL;
const downloadFolder = process.env.DOWNLOAD_FOLDER || 'downloads';

if (!playlistIdOrUrl) {
  console.error('PLAYLIST_ID_OR_URL is not set in the environment variables');
  process.exit(1);
}

console.log(`Songs will be downloaded to: ${path.resolve(__dirname, downloadFolder)}`);

let accessToken: string;

try {
  accessToken = fs.readFileSync('access_token.txt', 'utf8').trim();
} catch (error) {
  console.error('Error reading access_token.txt:', error);
  process.exit(1);
}

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

interface Track {
  id: string;
  name: string;
}

interface SpotifyDownResponse {
  success: boolean;
  link: string;
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
}
interface SpotifyPlaylistTrack {
  track: {
    id: string;
    name: string;
    artists: { name: string }[];
  };
}

interface SpotifyPlaylistResponse {
  items: SpotifyPlaylistTrack[];
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

      const fullDownloadPath = path.join(__dirname, downloadFolder);
      if (!fs.existsSync(fullDownloadPath)) {
        fs.mkdirSync(fullDownloadPath);
      }

      const filePath = path.join(fullDownloadPath, fileName);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`Downloaded "${data.metadata.artists} - ${data.metadata.title}"`);

    } else {
      console.error(`*** Download failed for "${track.name}"`);
    }
  } catch (error) {
    console.error(`*** Download failed for "${track.name}"`);
  }
}

async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const url = `${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`;
    const limit = 100; // Maximum limit per request
    let offset = 0;
    let allTracks: Track[] = [];
  
    try {
      while (true) {
        const response = await fetch(`${url}?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          if (response.status === 401) {
            console.error('Unauthorized: Check if the access token is valid and has the required scopes.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json() as SpotifyPlaylistResponse;
        const tracks = data.items.map((item: SpotifyPlaylistTrack) => ({
          id: item.track.id,
          name: item.track.name
        }));
        allTracks = allTracks.concat(tracks);
        
        // Check if we have retrieved all tracks
        if (data.items.length < limit) {
          break;
        }
  
        // Increment the offset for the next batch
        offset += limit;
      }
  
      console.log('Number of tracks in playlist:', allTracks.length);
      return allTracks;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      if (error instanceof Error) {
        console.error('Full error message:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return [];
    }
  }

function extractPlaylistId(playlistIdOrUrl: string): string {
  const urlPattern = /^https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
  const match = playlistIdOrUrl.match(urlPattern);
  return match ? match[1] : playlistIdOrUrl;
}

async function downloadPlaylistTracks(playlistIdOrUrl: string): Promise<void> {
  try {
    const playlistId = extractPlaylistId(playlistIdOrUrl);
    const tracks = await getPlaylistTracks(playlistId);
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      console.log(`Downloading track ${i + 1} of ${tracks.length}: "${track.name}"`);
      await downloadTrack(track);
      // Add a small delay to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Error downloading playlist tracks:', error);
    if (error instanceof Error) {
      console.error('Full error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

downloadPlaylistTracks(playlistIdOrUrl);