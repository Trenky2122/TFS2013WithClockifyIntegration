//region constants
const tileClassNameQuery = ".tbTile";
const clockifyApiBaseAddress = "https://api.clockify.me/api/v1/"
//endregion

//region event handlers
const handleAdd = async (item, key)=>{
    let ticketNr = extractTicketNumberFromTileId(item.id);
    console.log("Add to clockify "+ticketNr);
    await addTicketToCurrentClockify(key, ticketNr).then(()=>console.log("done"));
}

const handleRemove = async (item, key)=>{
    let ticketNr = extractTicketNumberFromTileId(item.id);
    console.log("Remove from clockify "+ticketNr);
    await removeTicketFromCurrentClockify(key, ticketNr).then(()=>console.log("done"));
}

//endregion

//region utils
const extractTicketNumberFromTileId = (itemId)=>{
    return itemId.split("-")[1];
}

const setErrorMessage = (message)=>{
    document.querySelectorAll(".hub-title").forEach(item=>{
        item.innerHTML="<span style='color: red'>" + message + "</span>"
    });
}

const getNewEntryDescriptionAdd = (descriptionOld, ticketNr)=>{
    if(!descriptionOld){
        descriptionOld = ticketNr;
    }
    else {
        if(descriptionOld.indexOf(ticketNr) === -1)
            descriptionOld += ", " + ticketNr;
    }
    return descriptionOld;
}

const getNewEntryDescriptionRemove = (descriptionOld, ticketNr)=>{
    let newDescription = descriptionOld.replace(", " + ticketNr, "").replace(ticketNr, "");
    if(newDescription[0]==="," && newDescription[1]===" ")
        newDescription = newDescription.substring(2);
    return newDescription;
}
//endregion

//region clockify communication
const getClockifyUser = async (key) =>{
    let data = await fetch(clockifyApiBaseAddress+"user", {
        headers:{
            "X-Api-Key": key
        }
    });
    if(!data.ok){
        setErrorMessage("Something went wrong!");
        return false;
    }
    let user = await data.json();
    return user;
}

const getClockifyUserActiveEntry = async (user, key)=>{
    let data = await fetch(clockifyApiBaseAddress+"workspaces/"+user["activeWorkspace"]+"/user/"+user["id"]+"/time-entries?in-progress=true", {
        headers:{
            "X-Api-Key": key
        }
    });
    let entries = await data.json();
    if(entries.length === 0){
        setErrorMessage("Clockify not running!");
    }
    return entries[0];
}

const getClockifyUserLast2Entries = async (user, key)=>{
    let data = await fetch(clockifyApiBaseAddress+"workspaces/"+user["activeWorkspace"]+"/user/"+user["id"]+"/time-entries?page-size=2&in-progress=false", {
        headers:{
            "X-Api-Key": key
        }
    });
    let entries = await data.json();
    return entries;
}

const buildPutRequest = (entry, ticketId, description)=>{
    let retval = {
        "start": entry["timeInterval"]["start"],
        "billable": entry["billable"],
        "description": description,
        "projectId": entry["projectId"],
        "taskId": entry["taskId"],
        "customFields": entry["customFields"]
    }
    return retval;
}

const updateClockifyEntry = async (entry, entryPutRequest, key)=>{
    let data = await fetch(clockifyApiBaseAddress+"workspaces/"+entry["workspaceId"]+"/time-entries/"+entry["id"], {
        method: "PUT",
        headers:{
            'Content-Type': 'application/json',
            "X-Api-Key": key
        },
        body: JSON.stringify(entryPutRequest)
    });
    let entryNew = await data.json();
    return entryNew;
}

//endregion

//region main events
const addTicketToCurrentClockify = async (key, ticketId) =>{
    let user = await getClockifyUser(key);
    if (!user)
        return;
    let entry = await getClockifyUserActiveEntry(user, key);
    if(!entry)
        return false;
    let description = getNewEntryDescriptionAdd(entry["description"], ticketId);
    let entryPutRequest = buildPutRequest(entry, ticketId, description);
    let newEntry = await updateClockifyEntry(entry, entryPutRequest, key);
}

const removeTicketFromCurrentClockify = async (key, ticketId) =>{
    let user = await getClockifyUser(key);
    if (!user)
        return;
    let entry = await getClockifyUserActiveEntry(user, key);
    if(!entry)
        return false;
    let description = getNewEntryDescriptionRemove(entry["description"], ticketId);
    let entryPutRequest = buildPutRequest(entry, ticketId, description);
    let newEntry = await updateClockifyEntry(entry, entryPutRequest, key);
}

const recolorTickets = async (key, recentColor, activeColor)=>{
    let user = await getClockifyUser(key);
    if (!user)
        return;
    let last2Entries = await getClockifyUserLast2Entries(user, key);
    let currentEntry = await getClockifyUserActiveEntry(user, key);
    let last2EntriesDescription = "";
    for(let i=0;i<last2Entries.length; i++){
        last2EntriesDescription+=last2Entries[i]["description"] + "|";
    }
    let currentEntryDescription = "";
    if(currentEntry)
        currentEntryDescription = currentEntry["description"];
    document.querySelectorAll(tileClassNameQuery).forEach(item => {
        let ticketNr = extractTicketNumberFromTileId(item.id);
        if(currentEntryDescription.indexOf(ticketNr)!==-1){
            item.style.backgroundColor = activeColor;
        }
        else if(last2EntriesDescription.indexOf(ticketNr)!==-1){
            item.style.backgroundColor = recentColor;
        }
        else {
            item.style.backgroundColor = "#FFFFFF";
        }
    })
}

//endregion

//region runtime

chrome.storage.sync.get("clockifyApiKey").then(async keyStorageItem=>{
    let key = keyStorageItem["clockifyApiKey"];
    let recentTicketsColorStorageItem = await chrome.storage.sync.get("recentTicketsColor");
    let recentTicketsColor = "#55AAFF";
    if(recentTicketsColorStorageItem["recentTicketsColor"]){
        recentTicketsColor = recentTicketsColorStorageItem["recentTicketsColor"];
    }
    let currentTicketsColorStorageItem = await chrome.storage.sync.get("currentTicketsColor");
    let currentTicketsColor = "#55FFAA";
    if(currentTicketsColorStorageItem["currentTicketsColor"]){
        currentTicketsColor = currentTicketsColorStorageItem["currentTicketsColor"];
    }
    await recolorTickets(key, recentTicketsColor, currentTicketsColor);

    document.querySelectorAll(tileClassNameQuery).forEach(item=>{
        item.addEventListener("auxclick", async event=>{
            if(event.button != 1)
                return;
            if(event.altKey){
                await handleRemove(item, key);
            }
            else{
                await handleAdd(item, key);
            }
            await recolorTickets(key, recentTicketsColor, currentTicketsColor);
        });
    });
});

//endregion
