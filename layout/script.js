function initMap() {
  window.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 40.0076, lng: -83.0306 }, 
      zoom: 12
  });
}

function toggleChat() {
    const chatBox = document.getElementById('chat-box-container');
    if (chatBox.style.display === "none" || chatBox.style.display === "") {
        chatBox.style.display = "block";
    } else {
        chatBox.style.display = "none";
    }
}

function swapLocations() {
    let origin = document.getElementById("origin");
    let destination = document.getElementById("destination");
    let temp = origin.value;
    origin.value = destination.value;
    destination.value = temp;
}

function getGasPrices(callback) {
  fetch("https://www.fueleconomy.gov/ws/rest/fuelprices")
      .then(response => response.text())
      .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
      .then(data => {
          const prices = {
              regular: parseFloat(data.getElementsByTagName("regular")[0].textContent),
              midgrade: parseFloat(data.getElementsByTagName("midgrade")[0].textContent),
              premium: parseFloat(data.getElementsByTagName("premium")[0].textContent),
              diesel: parseFloat(data.getElementsByTagName("diesel")[0].textContent),
              e85: parseFloat(data.getElementsByTagName("e85")[0].textContent),
              electric: parseFloat(data.getElementsByTagName("electric")[0].textContent),
              lpg: parseFloat(data.getElementsByTagName("lpg")[0].textContent),
              cng: parseFloat(data.getElementsByTagName("cng")[0].textContent)
          };
          callback(prices);
      })
      .catch(error => {
          console.error("Error fetching gas prices:", error);
          callback(null);
      });
}

function downloadJSON(data, filename = 'route_info.json') {
    const jsonStr = JSON.stringify(data, null, 2); 
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function calculateRoute() {
    const origin = document.getElementById("origin").value;
    const destination = document.getElementById("destination").value;
    const carModel = document.getElementById("carModel").value;

    if (!origin || !destination) {
        alert("Please input valid location!");
        return;
    }
    
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    
    directionsService.route(
        {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING 
        },
        async function (response, status) {
            if (status === "OK") {
                directionsRenderer.setDirections(response);
                const route = response.routes[0].legs[0];
                const distanceKm = parseFloat(route.distance.text.replace(/[^0-9.]/g, ""));
                
                getGasPrices(async function(prices) {
                    if (!prices) {
                      console.error("Failed to get gas prices.");
                      return;
                    }
                    try {
                      const deepseekResult = await callDeepseekAPI(
                        "Please give me the best cost-effective route analysis.",
                        origin,
                        destination,
                        distanceKm,
                        carModel,
                        prices
                      );
                      console.log("Deepseek Analysis:", deepseekResult);
                      addMessageToChatBox('Assistant', deepseekResult);
                      addChatToSaved(deepseekResult, origin, destination);
                    } catch (error) {
                      console.error('Error calling Deepseek API:', error);
                    }
                  });

            } else {
                alert("Can't get the route: " + status);
            }
        }
    );
}
  
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

function addMessageToChatBox(role, content) {
    const messageElement = document.createElement('div');
    messageElement.innerHTML = `<strong>${role}:</strong> ${content}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function callDeepseekAPI(userMessage,origin, destination, distanceKm, carModel,prices) {
    console.log('analysisPrompt:', userMessage);
    console.log('origin:', origin);
    console.log('destination:', destination);
    console.log('distanceKm:', distanceKm);
    console.log('carModel:', carModel);
    console.log('prices:', prices);
    const pricesString = JSON.stringify(prices, null, 2);
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-9262f4e5a89d4315a2bebf52f2d9ca5d' 
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: "You are a helpful assistant.Now you are an assistant focused on planning driving destinations within the United States for users, specializing in mapping available routes." },
                { role: "user", 
                    content: `User wants to drive from ${origin} to ${destination}, distance is ${distanceKm} miles. The user's car model is: ${carModel}. Today's fuel prices: ${pricesString}.Additional info: ${userMessage}`
                 }
            ],
            model: "deepseek-chat"
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

function addChatToSaved(content, origin, destination) {
    const saved = JSON.parse(localStorage.getItem('savedChats') || '[]');
    const entry = {
      origin,
      destination,
      content,
      timestamp: new Date().toLocaleString()
    };
    saved.push(entry);
    localStorage.setItem('savedChats', JSON.stringify(saved));
}

sendButton.addEventListener('click', async () => {
    const userMessage = userInput.value.trim();
    if (userMessage) {
        addMessageToChatBox('You', userMessage);
        userInput.value = ''; 

        try {
            const assistantResponse = await callDeepseekAPI(userMessage); 
            addMessageToChatBox('Assistant', assistantResponse); 
            addChatToSaved(assistantResponse);
        } catch (error) {
            console.error('Error calling Deepseek API:', error);
            addMessageToChatBox('Assistant', 'Sorry, something went wrong. Please try again.');
        }
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendButton.click();
    }
});

function clearSavedChats() {
  if (confirm("Are you sure you want to delete all saved chats?")) {
    localStorage.removeItem("savedChats");
    location.reload();
  }
}

const saved = JSON.parse(localStorage.getItem('savedChats') || '[]');
const container = document.getElementById('savedChats');

if (saved.length === 0) {
  container.innerHTML = "<p>No saved chats yet.</p>";
} else {
  saved.forEach((chat, index) => {
    const summary = document.createElement('div');
    summary.className = 'chat-entry';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.style.float = 'right';
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.title = 'Delete this chat';

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm("Delete this chat?")) {
        saved.splice(index, 1);
        localStorage.setItem('savedChats', JSON.stringify(saved));
        location.reload();
      }
    });

    if (typeof chat === 'string') {
      summary.textContent = `Chat Entry #${index + 1}`;
      summary.appendChild(deleteBtn);
      summary.style.cursor = 'pointer';
      summary.addEventListener('click', () => {
        container.innerHTML = `
          <h2>Chat Entry #${index + 1}</h2>
          <div class="chat-entry">${chat}</div>
          <button onclick="location.reload()">Back to List</button>
        `;
      });
    } else {
      const { origin, destination, timestamp, content } = chat;
      summary.innerHTML = `${origin} → ${destination}<br><small>${timestamp}</small>`;
      summary.appendChild(deleteBtn);
      summary.style.cursor = 'pointer';
      summary.addEventListener('click', () => {
        container.innerHTML = `
          <h2>Chat for ${origin} → ${destination}</h2>
          <div class="chat-entry">${marked.parse(content)}</div>
          <button onclick="location.reload()">Back to List</button>
        `;
      });
    }

    container.appendChild(summary);
  });
}