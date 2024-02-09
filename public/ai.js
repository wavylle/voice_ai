// ai.js
const API_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = "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";
// Get the audio element
var audio = document.getElementById('myAudio');
var INIT_AUDIO = false
let controller = null; // Store the AbortController instance

const voiceId = "21m00Tcm4TlvDq8ikWAM"; // replace with your voice_id
const model = 'eleven_monolingual_v1';
const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
// let socket = new WebSocket(wsUrl);

let socket = null;
let isPlaying = false;
let audioDataArray = [];
let currentIndex = 0;

// Function to connect WebSocket
function connectWebSocket() {
    const socketUrl = wsUrl; // Replace 'your-websocket-url' with your actual WebSocket URL
    socket = new WebSocket(socketUrl);

    // WebSocket event listeners
    socket.onopen = function (event) {
        console.log("WebSocket connection opened");
        // Send initial message if needed
        sendInitialMessage();
    };

    socket.onmessage = function (event) {
        // Handle incoming messages
        const response = JSON.parse(event.data);
        console.log("Server response:", response);
        if (response.audio) {
            const base64Audio = response.audio;
            const decodedAudio = atob(base64Audio);
            const uint8Array = new Uint8Array(decodedAudio.length);

            for (let i = 0; i < decodedAudio.length; i++) {
                uint8Array[i] = decodedAudio.charCodeAt(i);
            }

            const blob = new Blob([uint8Array], { type: 'audio/mp3' });
            audioDataArray.push(blob);

            if (!isPlaying) {
                isPlaying = true;
                playAudioStream(currentIndex);
            } else {
                preloadNextAudio(currentIndex + 1);
            }
            console.log("Received audio chunk");
        } else {
            console.log("No audio data in the response");
        }

        if (response.isFinal) {
            console.log("Generation completed")
        }

        if (response.normalizedAlignment) {
            // use the alignment info if needed
        }
    };

    socket.onerror = function (error) {
        console.error(`WebSocket Error: ${error}`);
    };

    socket.onclose = function (event) {
        if (event.wasClean) {
            console.info(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
        } else {
            console.warn('WebSocket connection died');
          }
        // Attempt to reconnect
        setTimeout(connectWebSocket, 3000); // Retry after 3 seconds
    };
}

connectWebSocket()

// Function to send initial message
function sendInitialMessage() {
    const bosMessage = {
        "text": " ",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8
        },
        "xi_api_key": "c462b842dcb86ccd90c39e108423bbf2", // replace with your API key
    };
    socket.send(JSON.stringify(bosMessage));
}

// Function to preload next audio
function preloadNextAudio(nextIndex) {
    if (nextIndex < audioDataArray.length) {
        const objectURL = URL.createObjectURL(audioDataArray[nextIndex]);
        const audio = new Audio(objectURL);
        audio.load(); // Start preloading the audio
    }
}

// Function to play audio stream
function playAudioStream(index) {
    if (index >= audioDataArray.length) {
        isPlaying = false;
        return;
    }

    const objectURL = URL.createObjectURL(audioDataArray[index]);
    const audioElement = new Audio(objectURL);
    audioElement.play();

    currentIndex++;

    audioElement.onended = function () {
        playAudioStream(currentIndex);
    };
}


const generate = async (query) => {  
    var finalResponse = ""
    console.log("Query Received", query);
    // Create a new AbortController instance
    controller = new AbortController();
    const signal = controller.signal;
  
    try {
      // Fetch the response from the OpenAI API with the signal from AbortController
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: query }],
          max_tokens: 100,
          stream: true, // For streaming responses
        }),
        signal, // Pass the signal to the fetch request
      });
  
      // Read the response as a stream of data
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          
            console.log("Final Response: ", captions.textContent);          
          const eosMessage = {
              "text": ""
          };
          
          socket.send(JSON.stringify(eosMessage));

            if (INIT_AUDIO == true) {

              const apiUrl = 'http://localhost:3300/api/elevenlabsTTS';
              
              const requestData = { text: captions.textContent };
              
              fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
              })
              .then(response => response.json())
              .then(data => {
                console.log("File Data: ", data);
                if(data["status"] == "success") {
                  var newSource = `audio/${data["saved_file"]}`;
                  audio.src = data["audioDataURI"];
                  // audio.src = newSource;
                  // Play the audio
                  audio.play();
                }
              })
              .catch(error => {
                console.error('Error:', error);
              });
            }
              
              break;
        }
        // Massage and parse the chunk of data
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        const parsedLines = lines
          .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
          .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
          .map((line) => JSON.parse(line)); // Parse the JSON string
  
        for (const parsedLine of parsedLines) {
          const { choices } = parsedLine;
          const { delta } = choices[0];
          const { content } = delta;
          // Update the UI with the new content
          if (content) {
            console.log(content);
            const textMessage = {
              "text": `${content} `,
              "try_trigger_generation": true,
          };
          
          socket.send(JSON.stringify(textMessage));
            if(subtitle_status == true) {
              document.getElementById("subtitle_text").textContent += content ? content : "";
            }
            captions.innerHTML += content ? `<span>${content}</span>` : "";
        }
    }
  }
    } catch (error) {
      // Handle fetch request errors
      if (signal.aborted) {
        console.log("Request aborted.");
      } else {
        console.error("Error:", error);
      }
    } finally {
      // Enable the generate button and disable the stop button
      controller = null; // Reset the AbortController instance
    }
  };
  
  const stop = () => {
    // Abort the fetch request by calling abort() on the AbortController instance
    if (controller) {
      controller.abort();
      controller = null;
    }
  };

// Create a global object to hold your functions
var aiModule = {
    get_ai_respose: function(query) {
      generate(query)
    },
  };
  