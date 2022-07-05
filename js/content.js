chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message[0] == "download") {
    const item = message[1];
    const a = document.createElement("a");
    const fileName = `${item.name}_${item.text.replace("\n", " ")}.mp4`;
    a.download = fileName;
    a.href = item.url;
    a.click();
    a.remove();
  }
  else if (message[0] == "table") {
    console.table(message[1]);

  }
  // console.log(message);
});
