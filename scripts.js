
const username = "user" + Math.floor(Math.random() * 1000);
document.getElementById("username").textContent = username;

const clientId = Math.random().toString(36);

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room") || "default";

const socket = new WebSocket(`wss://spectrum-working-surf.glitch.me/?room=${roomId}`);

let editor;
let cursorDecorations = {};
let isRemoteUpdate = false;

// WebRTC variables
let localStream;
let remoteStream;
let peerConnection;
let isAudioMuted = false;
let isVideoOff = false;

require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" } });
require(["vs/editor/editor.main"], function () {
    editor = monaco.editor.create(document.getElementById("editor"), {
        value: "// Start coding here...\n",
        language: "javascript",
        theme: "vs-dark",
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
    });

    editor.onDidChangeModelContent((event) => {
        if (isRemoteUpdate) return;

        const changes = event.changes;
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    type: "delta",
                    data: { changes, username, clientId },
                })
            );
        }
    });

    editor.onDidChangeCursorPosition((e) => {
        if (isRemoteUpdate) return;

        const position = editor.getPosition();
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    type: "cursor",
                    data: { username, position, clientId },
                })
            );
        }
    });

    document.getElementById('language-select').addEventListener('change', ()=> {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    type: "language",
                    data: { language: document.getElementById("language-select").value, username, clientId },
                })
            );
        }
    });

    document.getElementById("custom-input").addEventListener('change', () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(
                JSON.stringify({
                    type: "change-input",
                    data: { input: document.getElementById("custom-input").value, username, clientId },
                })
            );
        }
    });

    socket.onmessage = (event) => {
        if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = function () {
                const message = JSON.parse(reader.result);

                if (message.data.clientId === clientId) return;

                if (message.type === "delta") {
                    isRemoteUpdate = true;
                    applyDeltas(message.data.changes);
                    isRemoteUpdate = false;
                } else if (message.type === "cursor") {
                    updateCursor(message.data);
                } else if (message.type === "run-output") {
                    displayOutput(message.data.output);
                } else if (message.type === "language") {
                    setLanguage(message.data.language);
                } else if (message.type === "change-input") {
                    displayInput(message.data);
                } else if (message.type === "webrtc-signal") {
                    handleWebRTCSignal(message.data);
                }
            };
            reader.readAsText(event.data);
        }
    };

    function applyDeltas(changes) {
        editor.executeEdits(
            null,
            changes.map((change) => ({
                range: new monaco.Range(change.range.startLineNumber, change.range.startColumn, change.range.endLineNumber, change.range.endColumn),
                text: change.text,
                forceMoveMarkers: change.forceMoveMarkers,
            }))
        );
    }

    function updateCursor(cursorData) {
        const { username, position } = cursorData;
        showUserCursor(username, position);
    }

    function showUserCursor(username, position) {
        const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
        const options = {
            className: `user-cursor`,
            stickiness: 1,
        };

        if (cursorDecorations[username]) {
            cursorDecorations[username] = editor.deltaDecorations(cursorDecorations[username], [{ range, options }]);
        } else {
            cursorDecorations[username] = editor.deltaDecorations([], [{ range, options }]);
        }

        const cursorCoords =   editor.getScrolledVisiblePosition({ lineNumber: position.lineNumber, column: position.column });

        if (!cursorCoords) return;

        let cursorElement = document.querySelector(`.user-cursor[data-username="${username}"]`);
        let label = document.querySelector(`.username-label[data-username="${username}"]`);

        if (!cursorElement) {
            cursorElement = document.createElement("div");
            cursorElement.className = "user-cursor";
            cursorElement.dataset.username = username;
            document.body.appendChild(cursorElement);
        }

        if (!label) {
            label = document.createElement("div");
            label.className = "username-label";
            label.dataset.username = username;
            label.textContent = `${username} is typing...`;
            document.body.appendChild(label);
        }

        cursorElement.style.left = `${cursorCoords.left}px`;
        cursorElement.style.top = `${cursorCoords.top + 60}px`;
        cursorElement.style.width = "2px";
        cursorElement.style.height = "1.2em";

        const labelOffset = 80;
        label.style.left = `${cursorCoords.left}px`;
        label.style.top = `${cursorCoords.top + labelOffset}px`;
    }
});

socket.onopen = () => {
    console.log("WebSocket connection established");
    initializeWebRTC();
};
socket.onerror = (error) => console.error("WebSocket error:", error);
socket.onclose = () => console.log("WebSocket connection closed");

document.getElementById("run-button").addEventListener("click", () => {
    const code = editor.getValue();
    const language = document.getElementById("language-select").value;
    const input = document.getElementById("custom-input").value;

    runCodeWithPistonAPI(code, language, input)
        .then((output) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                    JSON.stringify({
                        type: "run-output",
                        data: { output, username, clientId },
                    })
                );
            }
            displayOutput(output);
        })
        .catch((error) => {
            console.error("Error running code:", error);
            displayOutput({ output: error.toString() });
        });
});

async function runCodeWithPistonAPI(code, language, input) {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            language: language,
            files: [{ content: code }],
            stdin: input,
            version: "*",
        }),
    });

    const result = await response.json();
    return result.run ? result.run : { output: "No output or error occurred." };
}

function displayOutput(output) {
    const outputElement = document.getElementById("output");
    outputElement.textContent = output.output || "No output";
    outputElement.innerHTML = outputElement.innerHTML.replace(/\n/g, "<br>");
}

function displayInput(input) {
    const inputElement = document.getElementById("custom-input");
    inputElement.textContent = input.input || "";
}

function setLanguage(language) {
    monaco.editor.setModelLanguage(editor.getModel(), language);
    document.getElementById("language-select").value = language;
}

// WebRTC functions
async function initializeWebRTC() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;

        peerConnection = new RTCPeerConnection();

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            document.getElementById('remote-video').srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendWebRTCSignal({ type: 'ice-candidate', candidate: event.candidate });
            }
        };

        await createAndSendOffer();
    } catch (error) {
        console.error('Error setting up WebRTC:', error);
    }
}

async function createAndSendOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendWebRTCSignal({ type: 'offer', offer: offer });
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

function sendWebRTCSignal(signal) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'webrtc-signal',
            data: { signal, username, clientId }
        }));
    }
}

async function handleWebRTCSignal(data) {
    if (data.signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendWebRTCSignal({ type: 'answer', answer: answer });
    } else if (data.signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
    } else if (data.signal.type === 'ice-candidate') {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
    }
}

document.getElementById('toggle-audio').addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isAudioMuted);
    document.getElementById('toggle-audio').textContent = isAudioMuted ? '🔇' : '🎤';
});

document.getElementById('toggle-video').addEventListener('click', () => {
    isVideoOff = !isVideoOff;
    localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
    document.getElementById('toggle-video').textContent = isVideoOff ? '🚫' : '📹';
});