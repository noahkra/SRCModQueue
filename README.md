# SRCModQueue
![release_shield](https://img.shields.io/github/v/release/noahkra/SRCModQueue?include_prereleases&color=blue) ![totaldownloads_shield](https://img.shields.io/github/downloads/noahkra/SRCModQueue/total?label=total%20downloads) ![latestdownloads_shield](https://img.shields.io/github/downloads-pre/noahkra/SRCModQueue/latest/total) 

![bug shield](https://img.shields.io/github/issues-raw/noahkra/SRCModQueue/bug) ![enhancements shield](https://img.shields.io/github/issues-raw/noahkra/SRCModQueue/enhancement) ![closedissues shield](https://img.shields.io/github/issues-closed-raw/noahkra/SRCModQueue?color=green)

Easy verification queue viewer for Speedrun.com moderators/verifiers.

Source will be uploaded as soon as I get it cleaned up :)

If you have any feature requests or want to report a bug, make sure to submit an [issue](https://github.com/noahkra/SRCModQueue/issues/new/choose) and it might get added in a future release!

# Features
- View the verification queue for any game on SRC.
	- View the run ID, leaderboard position, players, category, level (if applicable), primary run time and submission date for each run.
	- Player names coloured in the same gradient as on SRC with a flag (optional) to help with readability and recognisability.
	- View which runs are obsoleted and filter them out.
	- Filter by fullgame- or level runs.
- Select and bulk download run videos for easy verification (or a speedrun watching marathon).
- Download videos in the lowest available quality for the highest available framerate to optimise for download speed (usually 720p60).
- Dynamically adjusting UI to optimise screen space.
- Autoupdater for easy download and installation of new versions.

# How to use
- Search for the desired game in the autocomplete searchbox in the top right (or top left in vertical mode).
	- Both the game name and the SRC game ID will work for autocomplete.
- View all runs in the current verification queue.
	- Click on the run ID to open the run submission page in the browser.
	- Click on the player names to open the player profile in the browser.
- Select the desired runs to download. 
	- Hold down shift to select multiple runs in one go. 
	- Press the checkbox in the table header to select all runs, press it again to deselect all runs.
- Click the "Download selected" button to bulk download all selected runs simultaniously.
	- An orange download indicator bar will indicate the progress of the download.
	- The download indicator bar will turn green when the run is downloaded or if it is already present in the downloads folder.
- Double click on downloaded runs to highlight them in file explorer.

# Known issues
- Sometimes a download will hang because of the way YouTube works. Usually retrying the download will solve this problem. In the future an auto-retry feature may be added.
- Download bars don't resize correctly when resizing the window. Not a big issue but if you really can't stand it, pressing the "refresh runs" button will fix it until you resize again.
- Loading cursor will stay after initial startup. Just type in the game you wish to view and it will continue. Afterwards this won't happen anymore (it'll load the last viewed game on application launch).
