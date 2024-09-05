# Spotify Playlist Downloader

This project allows you to download tracks from a Spotify playlist.

## Environment Variables

Edit `.env` file in the root directory with the following variables:

- `DOWNLOAD_FOLDER`: The folder where downloaded tracks will be saved.
- `SPOTIFY_CLIENT_ID`: Your Spotify API client ID.
- `PLAYLIST_ID_OR_URL`: The ID or URL of the Spotify playlist you want to download.

### Obtaining Spotify Client ID

To get your Spotify Client ID:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/).
2. Log in with your Spotify account.
3. Click on "Create an App" or "Create New App".
4. Fill in the app name and description, then click "Create".
5. In your new app's dashboard, you'll find the `Client ID`.
6. In the app settings, add `http://localhost:8888/callback` as a Redirect URI.
7. Save the changes.
8. Copy the `Client ID` and paste it into your `.env` file.

Make sure to replace the placeholder values with your actual Spotify client ID and desired playlist ID or URL.