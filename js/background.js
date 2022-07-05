let filterUrls = [];
let voiceData = [];
let sheetData = {};

const sheetId = "12NpZ_Tq0OMAePUn-Wuu9lH0202L5f9nvJc1pEI5CM8M";
let accessKey = "";
setAccessKey();
function setAccessKey(reset = false) {
	chrome.storage.local.get("st_key", e => {
		if (!e.st_key || reset) {
			accessKey = window.prompt("Google Cloud Platform APIkeyを入力", "")
			chrome.storage.local.set({"st_key": accessKey});
		}
		else {
			accessKey = e.st_key;
		}
		// key消したいとき
		// chrome.storage.local.remove("st_key");
	});
}

chrome.webRequest.onBeforeRequest.addListener(function (details) {
	if (!details.url.split('?')[0].endsWith('.m4a')) return;
	if (filterUrls.includes(details.url)) return;

	filterUrls.push(details.url);

	let sendText = '';
	fetch(details.url)
	.then((res) => res.arrayBuffer())
	.then(arrayBuffer=>{
		const regex = new RegExp('[1-9][0-9]{12}');
		const s = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
		if (!regex.test(s)) return;

		sendText = s.match(regex)[0]
		const data = {
			"id": sendText,
			"url": details.url,
			"name": "",
			"text": ""
		};

		voiceData.push(data);

		saveVoiceList();
		setText();
	});
}, {urls: ['<all_urls>']}, []);

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message[0] == "function") {
		if (message[1] == "getAllSheetValues") getAllSheetValues();
		else if (message[1] == "removeVoiceList") removeVoiceList();
	}
	console.log(message);
});

function sendMessageToTab(data) {
	chrome.windows.getCurrent(function (win) {
		chrome.tabs.getSelected(win.id, function (tab) {
			chrome.tabs.sendMessage(tab.id, data);
		});
	});
}


async function getAllSheetValues() {
	chrome.runtime.sendMessage(["log", "取得開始"]);

	const sheetNames = await getSheetList();
	const values = await Promise.all(sheetNames.map(async e => getSheetValues(e)));

	chrome.storage.local.set({"st_sheet": values}, () => {
		chrome.storage.local.get("st_sheet", e => {
			chrome.runtime.sendMessage(["log", "取得完了"]);
		});
	});
}
async function getSheetList() {
	const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=`;
	let sheetNames;

	await fetch(baseUrl + accessKey)
	.then(res => res.json())
	.then(res => {
		sheetNames = res.sheets.map(e => e.properties.title).filter(e => !e.startsWith("#"));
	});

	return sheetNames;
}
async function getSheetValues(sheetName) {
	const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/`;
	const reqUrl = baseUrl + encodeURIComponent(sheetName) + "?key=" + accessKey;

	let voicelist = {};

	await fetch(reqUrl)
	.then(res => res.json())
	.then(res => {
		res.values.forEach((e, i) => {
			if (e.length < 2) return;
			const regex = new RegExp('[1-9][0-9]{12}');
			if (!regex.test(e[1])) return;
			voicelist[e[1]] = {
				"name": e[2],
				"text": e[3]
			};
		});
	});

	return voicelist;
}

function setText() {
	voiceData.forEach((item, i) => {
		if (item.text != "") return;
		if (sheetData[item.id] === undefined) return;
		item.name = sheetData[item.id].name;
		item.text = sheetData[item.id].text;
	});

	voiceData = Array.from(new Set(voiceData));

	saveVoiceList();
}

function removeVoiceList() {
	voiceData = [];
	filterUrls = [];
	chrome.storage.local.set({"st_voice": []});
}
function saveVoiceList() {
	chrome.storage.local.set({"st_voice": voiceData});
}
function loadSheetData() {
	chrome.storage.local.get("st_sheet", e => {
		e.st_sheet.forEach((item, i) => {
			Object.assign(sheetData, item);
		});
	});
}

// getAllSheetValues();
saveVoiceList();
loadSheetData();
