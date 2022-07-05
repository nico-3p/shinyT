let sheetData = {};
let voiceData = [];

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message[0] == "log") {
    document.getElementById("log").textContent = message[1];
  }
  console.log(message);
});

chrome.storage.local.get("st_voice", e => {
  voiceData = e.st_voice;
  e.st_voice.forEach((item) => {
    const tbody = document.querySelector('tbody');
    const tr = document.createElement("tr");
    const td_id = document.createElement("td");
    const td_name = document.createElement("td");
    const td_text = document.createElement("td");
    const input_id = document.createElement("input");

    input_id.type = "number";
    input_id.value = item.id;
    input_id.step = "10";
    input_id.style.width = "7rem";
    input_id.addEventListener('change', e => {
      item.id = input_id.value;

      item.name = sheetData[item.id].name;
      item.text = sheetData[item.id].text;
      td_name.textContent = item.name;
      td_text.textContent = item.text;

      saveVoiceList();
    });
    td_id.appendChild(input_id);

    td_name.textContent = item.name;

    td_text.innerHTML = item.text.replace("\n", "<br>");;
    td_text.style.cursor = "pointer";
    td_text.addEventListener("click", () => {
      playAudio(item.url);
    });
    td_text.addEventListener("dblclick", () => {
      downloadAudio(item);
    });

    tr.appendChild(td_name);
    tr.appendChild(td_text);
    tr.appendChild(td_id);
    tbody.appendChild(tr);
  });
});

document.getElementById("but_getData").addEventListener("click", () => {
  chrome.runtime.sendMessage(["function", "getAllSheetValues"]);
});
document.getElementById("but_clear").addEventListener("click", () => {
  voiceData = [];
  document.querySelector('tbody').innerHTML = null;
  chrome.runtime.sendMessage(["function", "removeVoiceList"]);
});

document.getElementById("search_name").addEventListener("change", searchData);
document.getElementById("search_text").addEventListener("change", searchData);

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
let prevAudioSource;

function loadAudio(url) {
  return fetch(url)
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => {
    return new Promise((resolve, reject) => {
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        resolve(audioBuffer);
      }, (err) => {
        reject(err);
      });
    });
  });
}
function playAudio(url) {
  loadAudio(url)
  .then(audioBuffer => {
    if (prevAudioSource !== undefined) prevAudioSource.stop();

    const audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioContext.destination);
    audioSource.start();

    prevAudioSource = audioSource;
  });
}
function downloadAudio(item) {
  sendMessageToTab(["download", item]);
}

function sendMessageToTab(data) {
  chrome.windows.getCurrent(function (win) {
    chrome.tabs.getSelected(win.id, function (tab) {
      chrome.tabs.sendMessage(tab.id, data);
    });
  });
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
loadSheetData();

function searchData() {
  const sn = document.getElementById("search_name").value;
  const st = document.getElementById("search_text").value;

  if (st == "") return;

  const resultArr = [];
  const regexSN = sn == "" ? new RegExp(".*") : new RegExp(sn);
  const regexST = new RegExp("(" + st + ")", "g");

  Object.keys(sheetData).forEach(key => {
  	if (regexSN.test(sheetData[key].name) && regexST.test(sheetData[key].text)) resultArr.push([sheetData[key].name, sheetData[key].text]);
  });

  const tbody = document.querySelector('tbody');
  tbody.innerHTML = null;

  resultArr.forEach((item, i) => {
    const tr = document.createElement("tr");
    const td_name = document.createElement("td");
    const td_text = document.createElement("td");

    td_name.textContent = item[0];
    td_text.innerHTML = item[1].replaceAll(regexST, "<strong>$1</strong>").replace("\n", "<br>");

    tr.appendChild(td_name);
    tr.appendChild(td_text);
    tbody.appendChild(tr);
  });

  // console.log(resultArr);
  sendMessageToTab(["table", resultArr]);
}
