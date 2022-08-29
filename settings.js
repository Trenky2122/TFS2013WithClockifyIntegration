document.getElementById("clockifyApiKey").onchange = saveClockifyApiKey;
document.getElementById("recentTicketsColor").onchange = saveRecentTicketsColor;
document.getElementById("currentTicketsColor").onchange = saveCurrentTicketsColor;
function saveClockifyApiKey(event){
    chrome.storage.sync.set({clockifyApiKey:event.target.value});
}

function saveCurrentTicketsColor(event){
    chrome.storage.sync.set({currentTicketsColor:event.target.value});
}

function saveRecentTicketsColor(event){
    chrome.storage.sync.set({recentTicketsColor:event.target.value});
}

chrome.storage.sync.get("recentTicketsColor").then(storageItem=>{
    if(storageItem["recentTicketsColor"]){
        document.getElementById("recentTicketsColor").value = storageItem["recentTicketsColor"];
    }
});

chrome.storage.sync.get("currentTicketsColor").then(storageItem=>{
    if(storageItem["currentTicketsColor"]){
        document.getElementById("currentTicketsColor").value = storageItem["currentTicketsColor"];
    }
});
