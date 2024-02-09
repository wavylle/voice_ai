const ElevenLabs = require("elevenlabs-node");
const fileName = "audio4.mp3"
const fs = require("fs-extra");
const player = require("play-sound")((opts = {}));

const voice = new ElevenLabs(
    {
        apiKey:  "440fb25dd4e2474552e8e244834e4779", // Your API key from Elevenlabs
        voiceId: "pNInz6obpgDQGcFmaJgB",             // A Voice ID from Elevenlabs
    }
);

var ttsModule = {
    elevenlabs_tts_stream: function(text) {
      generateTTS(text)
    },
  };

// generateTTS("Hey boy")

  function generateTTS(text) {
    var d = new Date(); // for now

    console.log(d.getHours(), d.getMinutes(), d.getSeconds());

      const voiceResponse = voice.textToSpeechStream({
          // Required Parameters
          textInput:       "Hello! How can I assist you today?",                // The text you wish to convert to speech
          
          // Optional Parameters
          voiceId:         "21m00Tcm4TlvDq8ikWAM",         // A different Voice ID from the default
          stability:       0.5,                            // The stability for the converted speech
          similarityBoost: 0.5,                            // The similarity boost for the converted speech
          modelId:         "eleven_multilingual_v2",       // The ElevenLabs Model ID
          style:           1,                              // The style exaggeration for the converted speech
          responseType:    "stream",                       // The streaming type (arraybuffer, stream, json)
          speakerBoost:    true                            // The speaker boost for the converted speech
        }).then((res) => {
            res.pipe(fs.createWriteStream(fileName)).on("finish", () => {
              var d = new Date(); // for now

              console.log(d.getHours(), d.getMinutes(), d.getSeconds());
              // player.play("audio3.mp3", (err) => {
              //   if (err) throw err;
              // });
            });
        });
        
        
    }
