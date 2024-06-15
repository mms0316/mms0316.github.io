const domSessionSave = document.getElementById('session_save');
const domSessionLoad = document.getElementById('session_load');

let onSessionLoad;

function setOnSessionLoad(fn) {
    onSessionLoad = fn;
}

function createSessionOption(id) {
    const key = "session_qtty_" + id;
    const name = localStorage.getItem(key);
    const domOption = document.createElement("option");
    domOption.value = id;
    domOption.innerText = name;
    domSessionLoad.appendChild(domOption);
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
    if (this.value === "") return;

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

        //check if name already exists
        const sessionName = "session_name_" + name;
        let id = localStorage.getItem(sessionName);
        if (id == null) {
            //use new entry
            id = localStorage.getItem("session_qtty") || "0";
            newEntry = true;
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

            createSessionOption(id);
        }
    }
}
