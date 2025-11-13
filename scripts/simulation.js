let simInterval = null;
let isPaused = false;

function simulate() {
  const m = parseFloat(document.getElementById("mass").value);
  const tb = parseFloat(document.getElementById("burntime").value);
  const fn = parseFloat(document.getElementById("fn").value);

  const a = fn / m;
  document.getElementById("acceleration").textContent =
    `Acceleration = ${fn} / ${m} = ${a.toFixed(2)} m/s²`;

  let x = 0;
  let v = 0;
  let t = 0;
  const duration = 100;

  const rocket = document.getElementById("rocket");
  rocket.style.bottom = "0px";


  if (simInterval) clearInterval(simInterval);
  isPaused = false;

  simInterval = setInterval(() => {
    if (!isPaused) {
      if (t < tb) {
        x = 0.5 * a * t * t;
        v = a * t;
      } else {
        x += v;
      }

      rocket.style.bottom = (x * 2) + "px";

      document.getElementById("timeVal").textContent = t;
      document.getElementById("posVal").textContent = x.toFixed(2);
      document.getElementById("velVal").textContent = v.toFixed(2);

      t++;

      if (t > duration) {
        clearInterval(simInterval);
      }
    }
  }, 100);
}



function togglePause() {
  isPaused = !isPaused;
  const pauseBtn = document.querySelector('button[onclick="togglePause()"]');
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
}



function resetSimulation() {
  // Reset time, position, velocity values
  document.getElementById("timeVal").textContent = 0;
  document.getElementById("posVal").textContent = "0.00";
  document.getElementById("velVal").textContent = "0.00";

  // Reset rocket to ground
  const rocket = document.getElementById("rocket");
  rocket.style.bottom = "0px";

  // Optional: clear input fields
  document.getElementById("mass").value = "";
  document.getElementById("burntime").value = "";
  document.getElementById("fn").value = "";

  // Stop any running simulation (if simulate was clicked multiple times)
  if (window.simInterval) {
    clearInterval(window.simInterval);
  }
}