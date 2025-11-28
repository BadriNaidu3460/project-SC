const video = document.getElementById('webcam');
const startBtn = document.getElementById('startBtn');
const prediction = document.getElementById('prediction');
const textOutput = document.getElementById('textOutput');
let streamActive = false;
let constructedText = '';

let lastLetter = '';
let sameLetterCount = 0;
const STABLE_FRAMES = 5; // higher = smoother, lower = faster

async function initWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
}

startBtn.addEventListener('click', async () => {
  if (!streamActive) {
    await initWebcam();
    streamActive = true;
    startBtn.textContent = 'Stop Recognition';
    startPrediction();
  } else {
    video.srcObject.getTracks().forEach(track => track.stop());
    streamActive = false;
    startBtn.textContent = 'Start Recognition';
  }
});

async function startPrediction() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 128; // must match your model input size
  canvas.height = 128;

  async function captureFrame() {
    if (!streamActive) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const result = await response.json();
      let currentLetter = result.letter;

      // Treat "fist" as "space"
      if (currentLetter.toLowerCase() === 'fist') {
        currentLetter = 'space';
      }

      prediction.textContent = currentLetter;

      // Smooth prediction logic
      if (currentLetter === lastLetter) {
        sameLetterCount++;
      } else {
        sameLetterCount = 0;
        lastLetter = currentLetter;
      }

      // Add stable letter after consistent predictions
      if (sameLetterCount >= STABLE_FRAMES) {
        if (currentLetter !== 'nothing' && currentLetter !== 'space') {
          constructedText += currentLetter;
        } else if (currentLetter === 'space') {
          constructedText += ' ';
        }

        textOutput.textContent = constructedText;
        sameLetterCount = 0;
      }
    } catch (err) {
      console.error('Error:', err);
    }

    requestAnimationFrame(captureFrame);
  }

  captureFrame();
}
