const domSessionLoad = document.getElementById('session_load');
const domSessionSave = document.getElementById('session_save');
const domSessionDelete = document.getElementById('session_delete');

let onSessionLoad;

function setOnSessionLoad(fn) {
    onSessionLoad = fn;
}

function createSessionOption(id) {
    const key = "session_qtty_" + id;
    const name = localStorage.getItem(key);
    const isDeleted = localStorage.getItem('session_deleted_' + id);

    if (isDeleted == null) {
        const domOption = document.createElement("option");
        domOption.value = id;
        domOption.innerText = name;
        domSessionLoad.add(domOption);
    }
}

function loadSessionNames() {
    const qtty = localStorage.getItem("session_qtty");
    if (qtty != null) {
        for (let i = 0; i < +qtty; i++ ) {
            createSessionOption(i);
        }
    }
}

function loadSession(id) {
    //iterate inputs
    const domInputs = document.getElementsByTagName("input");
    for (const domInput of domInputs) {
        //skip
        if (domInput.type === 'file') continue;
        if (domInput.id === 'result_zoom') continue;

        const value = localStorage.getItem(id + '_' + domInput.id);
        if (value != null) {
            if (domInput.type === 'checkbox') {
                domInput.checked = value === "1" ? true : false;
            }
            else {
                domInput.value = value;
            }
        }
    }
    //iterate selects
    const domSelects = document.getElementsByTagName("select");
    for (const domSelect of domSelects) {
        //skip session
        if (domSelect.id === "session_load") continue;

        const value = localStorage.getItem(id + '_' + domSelect.id);
        if (value != null)
            domSelect.value = value;
    }

    if (onSessionLoad)
        onSessionLoad();
}

domSessionLoad.addEventListener('change', function() {
    if (this.value === "") {
        domSessionDelete.setAttribute('disabled', 'disabled');
        return;
    }

    domSessionDelete.removeAttribute('disabled');
    loadSession(this.value);
});

domSessionSave.addEventListener('click', function() {
    saveSession();
})

function saveSession(name) {
    if (name === undefined) {
        do {
            name = prompt("Input name to save changes to");
        } while (name === "");
    }

    if (name != null) {
        let newEntry = false;
        let reuseEntry = false;

        //check if name already exists
        const sessionName = "session_name_" + name;
        let id = localStorage.getItem(sessionName);
        if (id == null) {
            //use new entry
            id = localStorage.getItem("session_qtty") || "0";
            newEntry = true;
        }

        //clear if removed then remade
        const deleteKey = 'session_deleted_' + id;
        if (localStorage.getItem(deleteKey) != null) {
            localStorage.removeItem('session_deleted_' + id);
            reuseEntry = true;
        }

        //iterate inputs
        const domInputs = document.getElementsByTagName("input");
        for (const domInput of domInputs) {
            //skip
            if (domInput.type === 'file') continue;
            if (domInput.id === 'result_zoom') continue;

            let value;
            if (domInput.type === 'checkbox') {
                value = domInput.checked ? "1" : "0";
            }
            else {
                value = domInput.value;
            }

            localStorage.setItem(id + '_' + domInput.id, value);
        }
        //iterate selects
        const domSelects = document.getElementsByTagName("select");
        for (const domSelect of domSelects) {
            //skip session
            if (domSelect.id === "session_load") continue;
            localStorage.setItem(id + '_' + domSelect.id, domSelect.value);
        }

        //save
        if (newEntry) {
            localStorage.setItem("session_qtty_" + id, name);
            localStorage.setItem(sessionName, id);
            localStorage.setItem("session_qtty", (1 + Number(id)).toString());
        }

        if (newEntry || reuseEntry) {
            createSessionOption(id);
        }

        domSessionLoad.value = id;
    }
}

domSessionDelete.addEventListener('click', function() {
    const id = domSessionLoad.value;
    if (id === "") return;

    //iterate inputs
    const domInputs = document.getElementsByTagName("input");
    for (const domInput of domInputs) {
        //skip
        if (domInput.type === 'file') continue;
        if (domInput.id === 'result_zoom') continue;

        localStorage.removeItem(id + '_' + domInput.id);
    }
    //iterate selects
    const domSelects = document.getElementsByTagName("select");
    for (const domSelect of domSelects) {
        //skip session
        if (domSelect.id === "session_load") continue;

        localStorage.removeItem(id + '_' + domSelect.id);
    }

    //do not move all other IDs - just set this id as deleted
    localStorage.setItem('session_deleted_' + id, '1');

    //remove from DOM
    domSessionLoad.remove(domSessionLoad.selectedIndex);

    domSessionLoad.value = '';
});
