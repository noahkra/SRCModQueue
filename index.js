// If you want me to add comments to any part of this code to clarify it's function don't hesitate to message me.

const { ipcRenderer: ipcR } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

// Local storage. Used for keeping track of user settings, unfinished/incomplete downloads and last searched game.
const ls = {
	get: item => JSON.parse(localStorage.getItem(item)),
	set: (item, value) => localStorage.setItem(item, JSON.stringify(value)),
};

// Session storage. Cache for the API data; runs, leaderboards, games on SRC etc. If this stuff needs to be fetched every time the program is going to run really slow.
const ss = {
	get: item => JSON.parse(sessionStorage.getItem(item)),
	set: (item, value) => sessionStorage.setItem(item, JSON.stringify(value)),
};

const getEl = document.getElementById.bind(document); // Shortcut for document.getElementById(x), because I use that a lot and it looks neater this way.

const srcAPI = async url => (await fetch("https://www.speedrun.com/api/v1" + url)).json(); // Shortcut for SRC API endpoint.

const paths = {
	top       : path.join(process.env.APPDATA, "SRCModQueue"),
	downloads : path.join(process.env.APPDATA, "SRCModQueue", "downloads")
};


let lastSelectedRow = 1; // Used for multiselect.

// For first startup.
function setDefaultSettings() {
	ls.set("optHMS", false);
	ls.set("optFlags", true);
	ls.set("optHideObsolete", false);
	ls.set("optHideLevels", false);
	ls.set("optHideFullgame", false);
	ls.set("optRunID", false);
	ls.set("optAutoRetry", true);
	ls.set("selectedGame", "");
}

// Loading stored settings on startup.
function loadStoredSettings() {
	getEl("optHMS").checked          = ls.get("optHMS");
	getEl("optFlags").checked        = ls.get("optFlags");
	getEl("optHideObsolete").checked = ls.get("optHideObsolete");
	getEl("optHideLevels").checked   = ls.get("optHideLevels");
	getEl("optHideFullgame").checked = ls.get("optHideFullgame");
	getEl("optRunID").checked        = ls.get("optRunID");
	getEl("optAutoRetry").checked    = ls.get("optAutoRetry");
	getEl("gamesInput").value        = ls.get("selectedGame");
}

function populateGamesOptions(options) {
	let list = getEl("gamesList");
	options.forEach(o => {
		let option = document.createElement("option");
		option.label = o.id;
		option.value = o.names.international ?? o.names.japanese;
		list.appendChild(option);
	});
}

function getSRCGames() {
	return new Promise(resolve => {
		document.body.style.cursor = "wait";
		if (ss.get("SRCGames")) {
			document.body.style.cursor = "";
			resolve(ss.get("SRCGames"));
			return;
		}
		console.log("Getting games from API...");
		let data = [], api;
		let url = "/games?_bulk=yes&max=1000";
		let query = async function() {
			api = await srcAPI(url);
			data.push(...api.data);
			url = api.pagination.links.find(l => l.rel === "next")?.uri;
			if (!url) {
				ss.set("SRCGames", data);
				document.body.style.cursor = "";
				resolve(data);
			} else {
				url = url.substring(31); // Only grab the necessary part of the URL.
				query();
			}
		};
		query();
	});
}

async function getNewRuns(gameID) {
	if (!ss.get("newRuns_" + gameID)) {
		console.log("Getting new runs from API...");
		ss.set("newRuns_" + gameID, (await srcAPI("/runs?game=" + gameID + "&status=new&max=200&embed=category.variables,level,players")).data);
	}

	return ss.get("newRuns_" + gameID);
}

async function getAllRuns(gameID) {
	if (!ss.get("allRuns_" + gameID)) {
		console.log("Getting all runs from API...");
		ss.set("allRuns_" + gameID, (await srcAPI("/runs?game=" + gameID + "&orderby=date&direction=desc&max=200&embed=category.variables")).data);
	}

	return ss.get("allRuns_" + gameID);
}

async function getLeaderboardPlace(gameID, categoryID, time_t, levelID) {
	if (!ss.get("leaderboards_" + gameID + categoryID + levelID)) {
		console.log("Getting leaderboards from API...");
		ss.set("leaderboards_" + gameID + categoryID + levelID, (levelID ?
			(await srcAPI(`/leaderboards/${gameID}/level/${levelID}/${categoryID}`)) :
			(await srcAPI(`/leaderboards/${gameID}/category/${categoryID}`))).data.runs);
	}

	return addOrdinal(ss.get("leaderboards_" + gameID + categoryID + levelID).findIndex(r => r.run.times.primary_t > time_t) + 1);
}

function updateDownloadSelectedCount() {
	const selectedRows = [...getEl("runsList").rows].filter(r => r.classList.contains("selectedRow")).length;

	getEl("downloadVideos").childNodes[2].data = `Download ${selectedRows || ""} selected`;
	getEl("downloadVideos").disabled = !selectedRows;
}

async function downloadVideo(vidURL, id) {
	let p1 = performance.now();
	ls.set("dl_" + id, Date.now()); // Used to keep track of a download being completed/hanging. Might no longer be necessary as temporary .part files are now generated which can signify incomplete downloads on startup.

	let row = getEl(id);
	row.classList.remove("selectedRow");
	row.classList.add("downloading");
	row.onclick = null;

	let ytdl = spawn(path.join(process.cwd(), "resources", "yt-dlp.exe"), [
		vidURL,                                            // URL of the video to be downloaded.
		"-o", path.join(paths.downloads, id + ".%(ext)s"), // Output set to path, filename and extension.
		"-f", "bv[height<=720][ext=mp4]+ba",               // Format set to best video with a maximum height of 720p, muxxed with best audio.
		"--merge-output-format", "mp4"                     // Set output format to mp4.
	]);

	ytdl.stdout.setEncoding("utf8");
	ytdl.stdout.on("data", data => {
		console.log(data);
		let type = data.substring(data.indexOf("[") + 1, data.indexOf("]")).trim();
		let progress;
		switch (type) {
			case "download":
				progress = parseFloat(data.substring(data.indexOf("%") - 5, data.indexOf("%"))) / 100; // read percentage from the STDOUT progress messages.
				updateProgress(id, progress);
				ls.set("dl_" + id, Date.now());
				if (progress === 1) {
					clearInterval(dlWatcher);
				}
		}
	});

	// The download watcher makes sure hanging downloads get cancelled after a while and auto retries them if the option is enabled.
	let dlWatcher = setInterval(() => {
		if (Date.now() - ls.get("dl_" + id) >= 5000) {
			row.classList.add("hanging");
		}
		if (Date.now() - ls.get("dl_" + id) >= 10000) {
			clearInterval(dlWatcher);
			row.classList.remove("hanging");
			row.classList.remove("downloading");
			row.nextSibling.cells[0].firstChild.style.width = "100%";
			ytdl.kill("SIGINT");
			if (ls.get("optAutoRetry")) {
				ytdl.on("exit", () => {
					fs.unlink(path.join(paths.downloads, id + ".mp4"))
						.then(() => {
							localStorage.removeItem("dl_" + id);
							downloadVideo(vidURL, id);
						})
						.catch(e => {
							alert(`Couldn't retry download for ${id}.\n\n${e}`);
							row.classList.add("incomplete");
						});
				});
			} else {
				row.classList.add("incomplete");
			}
		}
	}, 1000);

	ytdl.on("exit", (_, sig) => {
		if (sig !== "SIGINT") {
			console.log("Finished in", (performance.now() - p1) / 1000);
			localStorage.removeItem("dl_" + id);
		}
	});

	ytdl.on("error", console.error);

	// This is the cancel icon.
	row.getElementsByTagName("i")[0].onclick = () => {
		ytdl.on("close", () => {
			fs.unlink(path.join(paths.downloads, row.id + ".mp4")); // DOES NOT WORK RIGHT NOW. Should look for a .part file, but as of now the generated .part file names are unpredictable to me.
			populateRunsList({ clean: true });
		});
		ytdl.kill("SIGINT");
	};

}

function checkDownloads() {
	if (!getEl("runsList").rows.length) { return; }
	[...getEl("runsList").rows]
		.filter(r => r.id)
		.forEach(r => {
			fs.access(path.join(paths.downloads, r.id + ".mp4")) // Partially not working because of the .part files
				.then(() => {
					if (ls.get("dl_" + r.id) && Date.now() - ls.get("dl_" + r.id) >= 10000) {
						r.classList.add("incomplete");
						r.nextSibling.cells[0].firstChild.style.width = "100%";
						r.onclick = null;
					} else {
						updateProgress(r.id, 1);
					}
				})
				.catch(()=>{}); // File doesn't exist, do nothing.
		});
}

function downloadVideos() {
	[...getEl("runsList").rows]
		.filter(r => r.classList.contains("selectedRow"))
		.forEach(r => downloadVideo(r.getAttribute("video"), r.id));
	updateDownloadSelectedCount();
}

function updateProgress(id, percentage) {
	let row = getEl(id);
	row.classList.remove("hanging");
	row.classList.remove("incomplete");
	row.classList.remove("downloaded");
	row.classList.add("downloading");
	let bar = row.nextSibling.cells[0].firstChild;
	if (percentage === 1) {
		row.classList.remove("downloading");
		row.classList.add("downloaded");
		row.click();
		row.onclick = null;
		row.ondblclick = function() {
			ipcR.send("shell", ["openFile", path.join(paths.downloads, id + ".mp4")]);
		};
		row.title = "Double click to highlight video in File Explorer";
	}

	bar.style.width = percentage * 100 + "%";
}

// Behold black magic ordinal function.
function addOrdinal(number) {
	let suffix = ["th", "st", "nd", "rd"];
	let value = number % 100;

	return number + (suffix[(value - 20) % 10] || suffix[value] || suffix[0]);
}


// Convert ms to user specified format.
function parseTime(time) {
	let HMS = ls.get("optHMS");
	let hours = Math.floor(time / 3600);
	time %= 3600;
	let mins = Math.floor(time / 60).toString();
	time %= 60;

	return (hours ? hours + (HMS ? "h " : ":") : "") +
		mins.padStart(2, "0") + (HMS ? "m " : ":") +
		time.toFixed(3).padStart(6, "0").replace(".", (HMS ? "s " : ".")) +
		(HMS ? "ms" : "");
}

// Name colour not working entirely as intended. As a quick fix if user doesn't use a gradient it currently just sets the username to #EE4444 to avoid errors. Apparently SRC doesn't list solid colours as a gradient of the same colours.
function parsePlayers(players) {
	return players.map(p => (
		`<span class="userNameWrapper">
			${p.location && ls.get("optFlags") ? `<img src="https://www.speedrun.com/images/flags/${p.location.country.code}.png">` : ""}
			<a class="userName"
				title="Open player profile page"
				href="${p.weblink}"
				target="_blank"
				style="background: linear-gradient(90deg, ${p["name-style"]["color-from"]?.dark || "#EE4444"}, ${p["name-style"]["color-to"]?.dark || "#EE4444"})">

				${p.names.international}
			</a>,</span> `
	)).join("").replace(/,<\/span> $/g, "</span>");
}

function parseValues(values, variables) {
	values = Object.entries(values);
	values = values.map(v => `${variables.find(va => va.id === v[0]).name}: ${variables.find(va => va.id === v[0]).values.values[v[1]].label}`);
	return values.join(" | ");

}

async function populateRunsList({ clean = false } = {}) {
	document.body.style.cursor = "wait";
	let skipLevels = ls.get("optHideLevels");
	let skipFullgame = ls.get("optHideFullgame");
	let skipObsolete = ls.get("optHideObsolete");
	let displayRunID = ls.get("optRunID");

	getEl("runsTableContainer").children[0].style.display = "";
	getEl("runsTableContainer").children[0].textContent = "Getting runs...";

	let gameID = [...getEl("gamesList").options].find(o => o.value === getEl("gamesInput").value).getAttribute("label");
	if (!gameID) { return; }
	const runsList = getEl("runsList");


	runsList.parentElement.tHead.rows[0].cells[5].style.display = (skipLevels ? "none" : "");

	runsList.parentElement.tHead.rows[0].cells[1].textContent = (displayRunID ? "Run ID" : "Run");

	const runs = (await getNewRuns(gameID)).filter(r => !((skipLevels && r.level.data?.id) ||
			(skipFullgame && !r.level.data?.id) ||
			!r.videos?.links));
	const allRuns = await getAllRuns(gameID);

	if (clean) {
		runsList.previousElementSibling.style.display = "none";
		runsList.innerHTML = "";
	}

	if (!runs.length) {
		getEl("runsTableContainer").children[0].textContent = "Verification queue is empty :)";
		document.body.style.cursor = "";

		return;
	}

	getEl("runsTableContainer").children[0].style.display = "none";

	for (let run of runs) {
		let obsolete = allRuns.filter(r => r.id !== run.id &&
			r.players[0].id === run.players.data[0].id &&
			r.category.data.id === run.category.data.id &&
			r.level == run.level.data?.id &&
			Object.entries(r.values).filter(v => !r.category.data.variables.data.find(va => va.id === v[0]).obsoletes)
				.every(v => Object.values(run.values).includes(v[1])) &&
			r.times.primary_t < run.times.primary_t)
			.sort((a, b) => a.times.primary_t - b.times.primary_t)[0];

		if (skipObsolete && obsolete) { continue; }

		let tr = [...runsList.rows].find(r => r.id === run.id);

		if (tr) {
			tr.cells[tr.cells.length - 2].textContent = parseTime(run.times.primary_t);
			tr.cells[3].innerHTML = parsePlayers(run.players.data);
			tr.cells[1].children[0].innerHTML = displayRunID ? run.id : "<i class=\"_24\">open_in_new</i>";
			continue;
		}

		tr = runsList.insertRow(-1);

		tr.id = run.id;

		tr.setAttribute("video", run.videos.links[0].uri);

		let div = document.createElement("div");
		div.classList.add("progressBar");

		let divCell = runsList.insertRow(-1).insertCell(0);
		divCell.colSpan = 10;
		divCell.appendChild(div);

		if (obsolete) {
			tr.classList.add("obsolete");
		}

		tr.innerHTML = `
			<td><input type="checkbox"><i title="Cancel download" class="cancel _24">cancel</i><i title="Delete download" class="delete _24">delete</i></td>
			<td><a title="Open run submission page" href="${run.weblink}" target="_blank">${displayRunID ? run.id : "<i class=\"_24\">open_in_new</i>"}</a></td>
			<td>${obsolete ? `<a title="Open obsoleting run page" href="${obsolete.weblink}" target="_blank">Obsolete</a>` : await getLeaderboardPlace(run.game, run.category.data.id, run.times.primary_t, run.level.data?.id)}</td>
			<td>${parsePlayers(run.players.data)}</td>
			<td title="${parseValues(run.values, run.category.data.variables.data)}">${run.category.data.name}</td>
			${skipLevels ? "" : `<td>${run.level.data?.name || "N/A"}</td>`}
			<td title="${run.times.primary_t === run.times.ingame_t ? `${parseTime(run.times.realtime_t)} RTA` : `${parseTime(run.times.ingame_t)} IGT`}"
			class="tableR">${parseTime(run.times.primary_t)}</td>
			<td title="${new Date(run.submitted)}">${run.submitted.substring(0, 10)}</td>
		`;
		runsList.previousElementSibling.style.display = "";

		tr.getElementsByTagName("i")[1].onclick = function(e) {
			if (e.shiftKey || window.confirm("Are you sure you want to delete this download?\n\nHold shift while clicking delete to skip this prompt.")) {
				fs.unlink(path.join(paths.downloads, run.id + ".mp4"))
					.then(() => populateRunsList({ clean: true }))
			}
		};

		tr.onclick = function(e) {
			if (!e.isTrusted) {
				this.getElementsByTagName("input")[0].checked = !getEl("selectAllRuns").checked;
			} else {
				getEl("selectAllRuns").checked = false;
				if (e.shiftKey) {
					[...runsList.rows]
						.filter((_, i) => i+2 > Math.min(this.rowIndex, lastSelectedRow) && i < Math.max(this.rowIndex, lastSelectedRow))
						.forEach(r => {
							r.getElementsByTagName("input")[0].checked = true;
							r.classList.add("selectedRow");
						});
					return;
				} else {
					lastSelectedRow = this.rowIndex;
				}
			}

			if (e.path[0].nodeName !== "INPUT") {
				this.getElementsByTagName("input")[0].checked = !this.getElementsByTagName("input")[0].checked;
			}

			this.getElementsByTagName("input")[0].checked ? this.classList.add("selectedRow") : this.classList.remove("selectedRow");
			updateDownloadSelectedCount();
		};
	}


	document.body.style.cursor = "";
	checkDownloads();
}

function addEventListeners() {
	// Buttons
	getEl("reloadAPI").onclick = () => {
		console.log("Reloading API...");
		sessionStorage.clear();
		populateRunsList({ clean: true });
	};
	getEl("refreshRuns").onclick = () => populateRunsList({ clean: true });
	getEl("downloadVideos").onclick = downloadVideos;
	getEl("showDownloads").onclick = () => ipcR.send("shell", ["openDownloads"]);

	// Settings
	getEl("optHMS").onclick = () => {
		ls.set("optHMS", getEl("optHMS").checked);
		populateRunsList();
	};
	getEl("optRunID").onclick = () => {
		ls.set("optRunID", getEl("optRunID").checked);
		populateRunsList();
	};
	getEl("optFlags").onclick = () => {
		ls.set("optFlags", getEl("optFlags").checked);
		populateRunsList();
	};
	getEl("optHideObsolete").onclick = () => {
		ls.set("optHideObsolete", getEl("optHideObsolete").checked);
		populateRunsList({ clean: true });
	};
	getEl("optHideLevels").onclick = () => {
		ls.set("optHideLevels", getEl("optHideLevels").checked);
		if (ls.get("optHideLevels")) { // Turn off hide fullgame when turning on hide levels
			ls.set("optHideFullgame", false);
			getEl("optHideFullgame").checked = false;
		}

		populateRunsList({ clean: true });
	};
	getEl("optHideFullgame").onclick = () => {
		ls.set("optHideFullgame", getEl("optHideFullgame").checked);
		if (ls.get("optHideFullgame")) { // Turn off hide levels when turning on hide fullgame
			ls.set("optHideLevels", false);
			getEl("optHideLevels").checked = false;
		}

		populateRunsList({ clean: true });
	};
	getEl("optAutoRetry").onclick = () => {
		ls.set("optAutoRetry", getEl("optAutoRetry").checked);
	};

	// Game input
	let gi = getEl("gamesInput");
	gi.onblur = () => {
		gi.value = ls.get("selectedGame");
	};

	gi.oninput = e => {
		let game = [...getEl("gamesList").options].find(g => g.value === e.target.value);
		if (game) {
			ls.set("selectedGame", e.target.value);
			populateRunsList({ clean: true });
		}
	};

	gi.onkeydown = e => {
		if (e.key === "Escape") {
			e.target.blur();
		}
	};

	// Select all checkbox
	getEl("selectAllRuns").onclick = () => {
		[...getEl("runsList").rows].forEach(tr => tr.click());
	};

}

async function main() {
	if (!localStorage.length) { setDefaultSettings(); }

	loadStoredSettings();
	addEventListeners();

	populateGamesOptions(await getSRCGames());

	if (ls.get("selectedGame")) {
		await populateRunsList();
	} else {
		getEl("runsTableContainer").children[0].textContent = "Select a game to view the verification queue!";
	}
}

main();

ipcR.on("dlStatusRequest", () => ipcR.send("dlStatus", ![...getEl("runsList").rows].filter(r => r.classList.contains("downloading")).length));
ipcR.on("cancelAllDl", () => {
	[...getEl("runsList").rows].filter(r => r.classList.contains("downloading"))
		.forEach(r => r.getElementsByTagName("i")[0].click());
	setInterval(() => {
		if (![...getEl("runsList").rows].filter(r => r.classList.contains("downloading")).length) {
			ipcR.send("cancelledAll");

		}
	}, 1000);
});