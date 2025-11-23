const options = {
  webcamEnabled: true,
  micEnabled: true,
  systemAudioEnabled: true,
  webcam: {
    x: 20,
    y: 20,
    width: 250,
    height: 180,
  },
};

async function startRecording() {
  let recorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];

  // ----- 1. Capture screen -----
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: options.systemAudioEnabled,
  });

  // ----- 2. Capture webcam (optional) -----
  let webcamStream: MediaStream | null = null;
  if (options.webcamEnabled) {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
  }

  // ----- 3. Capture mic audio (optional) -----
  let micStream: MediaStream | null = null;
  if (options.micEnabled) {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  }

  // ----- 4. Build audio mixer -----
  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();

  function connectAudioTracks(stream: MediaStream) {
    if (!stream) return;
    stream.getAudioTracks().forEach((track: MediaStreamTrack) => {
      const src = audioContext.createMediaStreamSource(new MediaStream([track]));
      src.connect(audioDestination);
    });
  }

  connectAudioTracks(screenStream);
  if (micStream) connectAudioTracks(micStream);

  const mixedAudioStream = audioDestination.stream;

  // ----- 5. Compose video into canvas -----
  const canvas = document.createElement("canvas");
  const videoTrack = screenStream.getVideoTracks()[0];
  const settings = videoTrack.getSettings();

  canvas.width = settings.width ?? 640;
  canvas.height = settings.height ?? 480;

  const ctx = canvas.getContext("2d");

  const screenVideo = document.createElement("video");
  screenVideo.srcObject = screenStream;
  screenVideo.play();

  let webcamVideo: HTMLVideoElement | null = null;
  if (webcamStream) {
    webcamVideo = document.createElement("video");
    webcamVideo.srcObject = webcamStream;
    webcamVideo.play();
  }

  let counter = 0;
  function drawFrame() {
    ctx?.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

    if (webcamVideo) {
      ctx?.drawImage(
        webcamVideo,
        options.webcam.x,
        options.webcam.y,
        options.webcam.width,
        options.webcam.height,
      );
    }

    counter++;
    if (counter % 60 === 0) {
      console.log("recording...");
    }

    requestAnimationFrame(drawFrame);
  }
  drawFrame();

  // ----- 6. Capture canvas and attach mixed audio -----
  const canvasStream = canvas.captureStream(30);

  mixedAudioStream.getAudioTracks().forEach((track) => {
    canvasStream.addTrack(track);
  });

  // ----- 7. Record final stream -----
  recorder = new MediaRecorder(canvasStream, {
    mimeType: "video/webm; codecs=vp9",
  });

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();
  };

  recorder.start();

  function cleanup() {
    // Stop tracks
    screenStream?.getTracks().forEach((t) => t.stop());
    webcamStream?.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());

    // Close audio context
    try {
      audioContext?.close();
    } catch (error) {
      console.error(error);
    }

    // Remove video elements to release memory
    if (webcamVideo) {
      webcamVideo.pause();
      webcamVideo.srcObject = null;
    }
    if (screenVideo) {
      screenVideo.pause();
      screenVideo.srcObject = null;
    }

    // Destroy canvas references
    const tracks = canvas?.captureStream()?.getTracks() || [];
    tracks.forEach((t) => t.stop());

    // Release global state
    chunks = [];
  }

  function stopRecording() {
    recorder?.stop();
    cleanup;
  }

  return stopRecording;
}

export { startRecording };
