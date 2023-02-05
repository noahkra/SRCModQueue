# SRCModQueue
![release_shield](https://img.shields.io/github/v/release/noahkra/SRCModQueue?include_prereleases&color=blue) ![totaldownloads_shield](https://img.shields.io/github/downloads/noahkra/SRCModQueue/total?label=total%20downloads) ![latestdownloads_shield](https://img.shields.io/github/downloads-pre/noahkra/SRCModQueue/latest/total) 

![bug shield](https://img.shields.io/github/issues-raw/noahkra/SRCModQueue/bug) ![enhancements shield](https://img.shields.io/github/issues-raw/noahkra/SRCModQueue/enhancement) ![closedissues shield](https://img.shields.io/github/issues-closed-raw/noahkra/SRCModQueue?color=green)

Easy verification queue viewer for Speedrun.com moderators/verifiers.

Source will be uploaded as soon as I get it cleaned up :)

If you have any feature requests or want to report a bug, make sure to submit an [issue](https://github.com/noahkra/SRCModQueue/issues/new/choose) and it might get added in a future release!

# Contents
- [Features](#features)
- [How to use](#how-to-use)
- [Options and buttons](#options-and-buttons)
- [Known issues](#known-issues)

***

# Features
- View the verification queue for any game on SRC.
	- View the run ID, leaderboard position, players, (sub-)category, level (if applicable), submitted run time and submission date for each run.
	- Player names coloured in the same gradient as on SRC with a flag (optional) to help with readability and recognisability.
	- View which runs are obsoleted and filter them out.
	- Filter by fullgame- or level runs.
- Select and bulk download run videos for easy verification (or a speedrun watching marathon).
- Download videos in the lowest available quality for the highest available framerate to optimise for download speed (usually 720p60).
- Delete downloaded videos directly from the UI.
- Dynamically adjusting UI to optimise screen space.
- Autoupdater for easy download and installation of new versions.

# How to use
- Search for the desired game in the autocomplete searchbox in the top right (or top left in vertical mode).
	- Both the game name and the SRC game ID will work for autocomplete.
- View all runs in the current verification queue.
	- Click on the run ID to open the run submission page in the browser.
	- Click on the player names to open the player profile in the browser.
	- Click on the obsolete text (if present) to open the obsoleting run page in the browser.
	- Hover over the category to view any variables the run might have.
	- Hover over the run time to view the second submitted run time (if available).
- Select the desired runs to download. 
	- Hold down shift to select multiple runs in one go. 
	- Press the checkbox in the table header to select all runs, press it again to deselect all runs.
- Click the "Download x selected" button to bulk download all selected runs simultaniously.
	- A blue download indicator bar will indicate the progress of the download.
	- Cancel the download at any time by pressing the cancel icon to the left of the run.
	- The download indicator bar will turn green when the run is downloaded or if it is already present in the downloads folder.
	- The download indicator bar will turn red when the download has failed or if there is an incomplete download in the downloads folder.
	- The program will automatically retry a download if it fails.
- Double click on downloaded runs to highlight them in file explorer.
- Delete downloads by pressing the bin icon to the left of the run.

# Options and buttons
### Refresh runs
Refresh the current list of runs. Use to refresh downloads when manually deleting from the downloads folder or if something went wrong while the runs were being loaded.
### Reload API
Clear the cached runs and verification lists of games visited in this session. Use to show a more up-to-date version of the list of runs if any runs were submitted or verified in the meantime.
### Download x selected
Download the runs selected in the runs list. The x will show the amount of selected runs and thus the amount of runs that will be downloaded when pressing this button.
### Show downloads
Open the folder containing all the downloaded runs in file explorer. Useful for bulk deleting downloaded files, but to show individual files it is recommended to double click the desired downloaded run in the runs list to highlight it in file explorer.
### Hide obsolete runs (Default: off)
Hide run submissions that have been obsoleted by newer submissions, verified or not. Runs are counted as obsoleted when a new faster runs is submitted by the same player, under the same category and (if applicable) level, with the same obsoleting variables (sub-categories).
### Hide level runs (Default: off)
Hide run submissions for individual levels. Disables Hide fullgame runs when clicked.
### Hide fullgame runs (Default: off)
Hide run submissions for fullgame categories. Disables Hide level runs when clicked.
### Display time in HMS (Default: off)
Display entries under the time header using h, m, s and ms instead of : and . (eg. 1h 20m 25s 130ms instead of 1:20:25.130).
### Display player flags (Default: on)
Display country flags in front of players (when available), mimicking SRC functionality.
### Display run ID (Default: off)
Display the ID that SRC has assigned to the run submission. When disabled just shows a link icon. Both the ID and icon are clickable and link to the run submission page.
### Auto retry downloads (Default: on)
Automatically retry failed downloads. Recommended to be left on unless you have a limited amount of bandwidth.

# Known issues
- The progress bar sometimes moves backwards (this is because video download, audio download and muxing progress are reported separately now).
- Sometimes SMQ won't detect the run finished downloading properly and will instead show them as failed. They are however available for viewing in the downloads folder.
- Failed or cancelled downloads aren't detected and as a result deleted properly yet and will thus stay in the downloads folder as a .part file.
