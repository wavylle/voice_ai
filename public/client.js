const captions = window.document.getElementById("captions");
// Get the audio element
var audio = document.getElementById('myAudio');

async function getMicrophone() {
  const userMedia = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  return new MediaRecorder(userMedia);
}

async function openMicrophone(microphone, socket) {
  await microphone.start(500);

  microphone.onstart = () => {
    console.log("client: microphone opened");
    document.body.classList.add("recording");
  };

  microphone.onstop = () => {
    console.log("client: microphone closed");
    document.body.classList.remove("recording");
  };

  microphone.ondataavailable = (e) => {
    const data = e.data;
    console.log("client: sent data to websocket");
    socket.send(data);
  };
}

async function closeMicrophone(microphone) {
  microphone.stop();
}

async function start(socket) {
  const listenButton = document.getElementById("record");
  let microphone;

  console.log("client: waiting to open microphone");

  listenButton.textContent = "Start Conversation"
  listenButton.style.pointerEvents="auto"
  listenButton.style.cursor="pointer";
  // listenButton.style.backgroundColor = "#000"
  // listenButton.style.color = "#fff"

  listenButton.addEventListener("click", async () => {
    if (!microphone) {
      // open and close the microphone
      microphone = await getMicrophone();
      await openMicrophone(microphone, socket);
    } else {
      await closeMicrophone(microphone);
      microphone = undefined;
    }
  });
}

async function getTempApiKey() {
  const result = await fetch("/key");
  const json = await result.json();

  return json.key;
}

const listenButton = document.getElementById("record");

window.addEventListener("load", async () => {
  listenButton.textContent = "Connecting..."
  listenButton.style.pointerEvents="none"
  listenButton.style.cursor="default";
  // listenButton.style.backgroundColor = "#a7a6a6"

  const key = await getTempApiKey();

  const { createClient } = deepgram;
  const _deepgram = createClient(key);

  const socket = _deepgram.listen.live({ model: "nova", smart_format: true });
  

  socket.on("open", async () => {
    console.log("client: connected to websocket");

    socket.on("Results", (data) => {
      console.log("Data: ", data);

      const transcript = data.channel.alternatives[0].transcript;

      if (transcript !== "") {
        console.log("Calling AI Module Function");
        if(subtitle_status == true) {
          document.getElementById("subtitle_text").textContent = ""
        }
        captions.innerHTML = "";
        var ai_response = aiModule.get_ai_respose(transcript);
        
        console.log("Final Response: ", ai_response);
        // ttsModule.generateTTS(ai_response)
      }
    });

    socket.on("error", (e) => console.error(e));

    socket.on("warning", (e) => console.warn(e));

    socket.on("Metadata", (e) => console.log(e));

    socket.on("close", (e) => console.log(e));

    await start(socket);
  });
});
