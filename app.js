require("v8-compile-cache");
const semVer = require("semver");
const {	app, BrowserWindow,	ipcMain: ipcM, shell, dialog } = require("electron");
const { createWriteStream } = require("fs");
const { spawn } = require("child_process");
const fetch = require("node-fetch");
const https = require("https");
const fs = require("fs/promises");
const path = require("path");

const paths = {
	top       : path.join(process.env.APPDATA, "SRCModQueue"),
	downloads : path.join(process.env.APPDATA, "SRCModQueue", "downloads"),
	tmp       : path.join(process.env.APPDATA, "SRCModQueue", "tmp")
};

const version = require("./package.json").version;

let renderer; // Making renderer a global enables us to attach the update dialog to it and make it modal.

async function validateDirectories() { // Needs better error handling...
	await fs.mkdir(paths.top)
		.catch(()=>{});
	await fs.mkdir(paths.downloads)
		.catch(()=>{});
	await fs.mkdir(paths.tmp)
		.catch(()=>{});

	return;
}

// Marvel at the absolute beauty and elegance of this autoupdater, no servers required.
async function checkForUpdates() {
	let releases = await (await fetch("https://api.github.com/repos/noahkra/SRCModQueue/releases", {
		headers: { "User-Agent": "SRCModQueue" }
	})).json();

	if (semVer.gt(semVer.valid(releases[0].tag_name), version)) {
		if ((await dialog.showMessageBox(renderer, {
			title: "A new update is available!",
			message: `A new version of SRC Mod Queue (${releases[0].tag_name}) is available on GitHub.

			Would you like to download and install this update?`,
			buttons: ["Yes", "No"],
			cancelId: 1
		})).response) { return; }

		dialog.showMessageBox(renderer, {
			title: "Downloading update...",
			message: "The new version will be installed once the download is done."
		});

		const installerPath = path.join(paths.tmp, releases[0].assets[0].name);

		let installer = createWriteStream(installerPath);

		https.get(releases[0].assets[0].browser_download_url, res => https.get(res.headers.location, res => res.pipe(installer)));

		installer.on("error", e => console.log("error", e));
		installer.on("close", () => {
			spawn(`${installerPath} && del /f ${installerPath}`, { detached: true, shell: true });
			app.quit();
		});
	}
}

async function main() {
	await validateDirectories();
	await app.whenReady();

	renderer = new BrowserWindow({
		title: `SRC Mod Queue v${version}`,
		// Width & height numbers are off, idk why.
		width     : 1216, // -16 = 1200px
		height    : 659,  // -39 = 620px
		minWidth  : 736,  // -16 = 720px
		minHeight : 509,  // -59 = 450px
		backgroundColor: "#191C1C",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	renderer.setMenu(null);

	await renderer.loadFile("index.html");

	checkForUpdates();

	if (process.argv[2] === "dev") { // Dev mode opens dev tools :)
		renderer.webContents.openDevTools({ mode: "detach" });
	}

	renderer.webContents.on("new-window", function(e, url) { // URL handler, open links to profile pages, run pages etc.
		e.preventDefault();
		require("electron").shell.openExternal(url);
	});

	renderer.on("close", e => { // Check for ongoing downloads before closing the program.
		renderer.webContents.send("dlStatusRequest");
		e.preventDefault();
		ipcM.on("dlStatus", async (_, safe) => {
			if (!safe) {
				if (!(await dialog.showMessageBox(renderer, {
					title: "Downloads have not finished.",
					message: `Some runs have not yet finished downloading. Quiting now will cancel these downloads.

					Are you sure you want to quit?`,
					buttons: ["Yes", "No"]
				})).response) {
					renderer.send("cancelAllDl");
					ipcM.on("cancelledAll", () => renderer.destroy());
				}

				return;
			}

			renderer.destroy();
		});

	});

}

main();

ipcM.on("shell", (e, arg) => { // File system interaction
	switch (arg[0]) {
		case "openDownloads":
			shell.openPath(path.join(process.env.APPDATA, "SRCModQueue", "downloads"));
			break;
		case "openFile":
			shell.showItemInFolder(arg[1]);
			break;
	}
});

app.on("window-all-closed", () => {
	app.quit();
});