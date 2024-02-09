const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { createClient } = require("@deepgram/sdk");
const dotenv = require("dotenv");
const path = require("path");


const ElevenLabs = require("elevenlabs-node");
const fileName = "audio.mp3"
const fs = require("fs-extra");

const client = createClient("4225d9aafbf5ce6aab74dec2519e872b4e0090d5");

const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const voice = new ElevenLabs(
  {
      apiKey:  "dcd2cbbeaaf10f4d09d5934e8fcc2ae3", // Your API key from Elevenlabs
      voiceId: "pNInz6obpgDQGcFmaJgB",             // A Voice ID from Elevenlabs
  }
);

app.use(express.static("public/"));
app.get("/conv", (req, res) => {
  res.sendFile(__dirname + "/public/conv2.html");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const getProjectId = async () => {
  const { result, error } = await client.manage.getProjects();

  if (error) {
    throw error;
  }

  return result.projects[0].project_id;
};

const getTempApiKey = async (projectId) => {
  const { result, error } = await client.manage.createProjectKey(projectId, {
    comment: "short lived",
    scopes: ["usage:write"],
    time_to_live_in_seconds: 20,
  });

  if (error) {
    throw error;
  }

  return result;
};

app.get("/key", async (req, res) => {
  const projectId = await getProjectId();
  const key = await getTempApiKey(projectId);

  res.json(key);
});


async function callTTS(inputText) {
  const options = {
    method: 'POST',
    headers: {
      'xi-api-key': 'dcd2cbbeaaf10f4d09d5934e8fcc2ae3',
      'Content-Type': 'application/json'
    },
    body: `{"model_id":"eleven_multilingual_v2","text":"${inputText}","voice_settings":{"similarity_boost":0.5,"stability":0.5,"style":1,"use_speaker_boost":true}}`,
  };
  try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', options);

      if (!response.ok) {
          throw new Error("Something went wrong");
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer, 'binary');
      const base64Audio = buffer.toString('base64')
      const audioDataURI = `data:audio/mpeg;base64,${base64Audio}`
      // const file = Math.random().toString(36).substring(7);
      // // const file = "ttsaudio";
      
      // fs.writeFile(path.join("public", "audio", `${file}.mp3`), buffer, () => {
      //   console.log("File written successfully");
      // });

      // console.log("Saving to: ", file)
      
      return { file: `` , audioDataURI: audioDataURI}
  
  } catch (err) {
      return { error: err.message };
  }
}

async function generateTTS(text) {
  const file = Math.random().toString(36).substring(7);

  try {
    const res = await voice.textToSpeechStream({
      textInput: text,
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      stability: 0.5,
      similarityBoost: 0.5,
      modelId: "eleven_multilingual_v2",
      style: 1,
      responseType: "stream",
      speakerBoost: true,
    });

    await new Promise((resolve) => {
      res.pipe(fs.createWriteStream(path.join("public", "audio", `${file}.mp3`))).on("finish", () => {
        resolve();
      });
    });

    return { file: `${file}.mp3`, audioDataURI: '' };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// New POST API endpoint
app.post("/api/elevenlabsTTS", async (req, res) => {
  // Assuming the request body contains a 'text' property
  console.log("Converting text to speech");
  console.log(req.body);
  const inputText = req.body.text;
  var tts = await callTTS(inputText)
  // var tts = await generateTTS(inputText)
  console.log("TTS Response: ", tts);
  
  if ("file" in tts) {
    res.json({ status: "success", saved_file: tts["file"] , audioDataURI: tts["audioDataURI"]});    
  }
  else {
    res.json({ status: "error" });    
  }
});

server.listen(3300, () => {
  console.log("Listening on http://localhost:3300");
});
