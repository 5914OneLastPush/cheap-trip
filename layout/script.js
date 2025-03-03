function initMap() {
  window.map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 40.0076, lng: -83.0306 }, 
      zoom: 12
  });
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

function calculateFuelCost(distance, pricePerUnit) {
  const avgMpg = 25; 
  const distanceMiles = distance / 1.609; 
  const gallonsNeeded = distanceMiles / avgMpg;
  return (gallonsNeeded * pricePerUnit).toFixed(2);
}

function calculateRoute() {
  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  
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
      function (response, status) {
          if (status === "OK") {
              directionsRenderer.setDirections(response);
              const route = response.routes[0].legs[0];
              const distanceKm = parseFloat(route.distance.text.replace(/[^0-9.]/g, ""));
              
              getGasPrices(function(prices) {
                  if (prices) {
                      let tableBody = document.querySelector("#fuelTable tbody");
                      tableBody.innerHTML = "";
                      for (const [fuelType, price] of Object.entries(prices)) {
                          const cost = calculateFuelCost(distanceKm, price);
                          let row = `<tr><td>${fuelType.toUpperCase()}</td><td>$${price.toFixed(2)}</td><td>$${cost}</td></tr>`;
                          tableBody.innerHTML += row;
                      }
                      document.getElementById("fuelTable").style.display = "table";
                      document.getElementById("output").innerHTML = `Distance: ${route.distance.text}, Estimate time: ${route.duration.text}`;
                  } else {
                      document.getElementById("output").innerHTML = `Distance: ${route.distance.text}, Estimate time: ${route.duration.text}, Unable to retrieve gas prices`;
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


async function callDeepseekAPI(userMessage) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-9262f4e5a89d4315a2bebf52f2d9ca5d' 
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: "You are a helpful assistant.Now you are an assistant focused on planning driving destinations within the United States for users, specializing in mapping available routes." },
                { role: "user", content: userMessage }
            ],
            model: "deepseek-chat"
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}


sendButton.addEventListener('click', async () => {
    const userMessage = userInput.value.trim();
    if (userMessage) {
        addMessageToChatBox('You', userMessage);
        userInput.value = ''; 

        try {
            const assistantResponse = await callDeepseekAPI(userMessage); 
            addMessageToChatBox('Assistant', assistantResponse); 
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