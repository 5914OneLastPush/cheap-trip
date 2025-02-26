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