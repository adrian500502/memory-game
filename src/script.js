import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { THREEx } from './util/THREEx.FullScreen.js';
import gsap from 'gsap';
import animals from './animals.js';

// Level and difficulty buttons & actions
const levelElementsArray = [
  document.getElementById('level-1'),
  document.getElementById('level-2'),
  document.getElementById('level-3'),
  document.getElementById('level-4'),
];
const difficultiesElementsArray = [
  document.getElementById('difficulty-beginner'),
  document.getElementById('difficulty-intermediate'),
  document.getElementById('difficulty-advanced'),
];

for (let i = 0; i < levelElementsArray.length; i++) {
  levelElementsArray[i].addEventListener('click', () => {
    loadLevel(i, activeDifficulty);
    levelElementsArray.forEach(
      (levelElement) => (levelElement.style.backgroundColor = 'rgb(255, 255, 255)')
    );
    window.getComputedStyle(levelElementsArray[i]).backgroundColor === 'rgb(255, 255, 255)' &&
      (levelElementsArray[i].style.backgroundColor = 'yellowgreen');
  });
}

for (let i = 0; i < difficultiesElementsArray.length; i++) {
  difficultiesElementsArray[i].addEventListener('click', () => {
    loadLevel(activeLevel, i);
    difficultiesElementsArray.forEach(
      (difficultyElement) => (difficultyElement.style.backgroundColor = 'rgb(255, 255, 255)')
    );
    window.getComputedStyle(difficultiesElementsArray[i]).backgroundColor ===
      'rgb(255, 255, 255)' && (difficultiesElementsArray[i].style.backgroundColor = 'lightskyblue');
  });
}

// Container restart element
const containerRestartElement = document.querySelector('.container-restart');
const restartElement = document.getElementById('restart');
restartElement.addEventListener('click', () => loadLevel(activeLevel, activeDifficulty));

// Full screen when "f" key is pressed
THREEx.FullScreen.bindKey({ charCode: 'f'.charCodeAt(0) });

// Check if user is on mobile device
let isMobile = /Android|iOS|iPhone|iPad|Mobile/i.test(navigator.userAgent);

// Canvas
const canvas = document.querySelector('canvas[class="webgl"]');

// Scene
const scene = new THREE.Scene();

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Perspective camera
const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 50);
!isMobile ? (camera.position.z = 5) : (camera.position.z = 15);
scene.add(camera);

// OrbitControls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
// controls.minPolarAngle = Math.PI * 0.25;
// controls.maxPolarAngle = Math.PI * 0.75;
// controls.minAzimuthAngle = -Math.PI / 3;
// controls.maxAzimuthAngle = Math.PI / 3;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// When window is resized
window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Pointer
const pointer = new THREE.Vector2();
window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Raycaster
const raycaster = new THREE.Raycaster();
raycaster.near = 0.1;
raycaster.far = 50;

/**
 * Game mechanics
 */
let intersects = [];
let arrPicks = [];

let numberOfMoves = 0;
let numberOfMatches = 0;
let matchesToWin = null;
let continueToPlay = true;

let userScore = 0;
let activeLevel = 1;
let activeDifficulty = 0;

const lossColor = new THREE.Color('#ff0000');
const matchColor = new THREE.Color('#00ff00');
const winColor = new THREE.Color('#ff8c00');

const timerElement = document.getElementById('timer');
const timerClock = new THREE.Clock(false);
let initialTime = null;
let timeLeft = null;
let timerClockRef = null;

// Game interactions & functions
const changeTileColor = (tileMaterialColor, destinationColor, duration) => {
  gsap.to(tileMaterialColor, {
    duration,
    r: destinationColor.r,
    g: destinationColor.g,
    b: destinationColor.b,
  });
};

const showTile = (mesh) => {
  gsap.to(mesh.rotation, {
    duration: 0.5,
    y: Math.PI,
  });

  gsap.to(mesh.position, {
    duration: 0.5,
    z: 0.4,
  });

  mesh.gameProps.selected = true;
  playSoundEffect(tileSwipeSoundEffect);
  if (!timerClock.running) {
    timerClock.start();
    timerClockRef = refreshTimerClock();
  }
};

const hideTile = (mesh) => {
  gsap.to(mesh.rotation, {
    duration: 0.5,
    y: 0,
  });

  gsap.to(mesh.position, {
    duration: 0.5,
    z: 0,
  });

  mesh.gameProps.selected = false;
};

const changeTilePositionZ = (tilePosition, duration = 0.5, delay = 0.5, z = -0.5) => {
  gsap.to(tilePosition, {
    duration,
    delay,
    z,
  });
};

// Smooth camera scroll-in animation
const cameraZoomIn = (duration = 1, zoom = 1.75, delay = 0.5) => {
  gsap.to(camera, {
    duration,
    zoom,
    delay,
    onUpdate: () => {
      camera.updateProjectionMatrix();
    },
  });
};

// Center camera animation
const cameraCenter = (duration = 0.5, vector3 = { x: 0, y: 0, z: 5 }) => {
  gsap.to(camera.position, {
    duration,
    x: vector3.x,
    y: vector3.y,
    z: vector3.z,
    onUpdate: () => {
      camera.updateProjectionMatrix();
    },
  });
};

let checkMatchNegativeRef;
const checkTileMatch = (firstPick, secondPick) => {
  continueToPlay = false;

  if (
    timerClock.running &&
    arrPicks.length === 2 &&
    firstPick.gameProps.selected &&
    secondPick.gameProps.selected &&
    firstPick.gameProps.enName === secondPick.gameProps.enName
  ) {
    firstPick.gameProps.match = true;
    secondPick.gameProps.match = true;

    changeTileColor(firstPick.material[5].color, matchColor, 0.25);
    changeTileColor(secondPick.material[5].color, matchColor, 0.25);
    changeTilePositionZ(firstPick.position);
    changeTilePositionZ(secondPick.position);

    playSoundEffect(matchSoundEffect);

    numberOfMatches++;
    arrPicks = [];
    timeLeft !== 0 && (continueToPlay = true);
  } else {
    arrPicks = [];

    checkMatchNegativeRef = window.setTimeout(() => {
      hideTile(firstPick);
      hideTile(secondPick);

      timeLeft !== 0 && (continueToPlay = true);

      timerClock.running && playSoundEffect(tileSwipeSoundEffect);
    }, 2000);
  }
};

// Listens to mouse event and checks if a tile has been selected
window.addEventListener('click', (event) => {
  if (event.button === 0 && intersects.length && continueToPlay) {
    const mesh = intersects[0].object;

    if (!mesh.gameProps.selected && !mesh.gameProps.match) {
      showTile(mesh);
      arrPicks.push(mesh);

      if (arrPicks.length === 2) {
        numberOfMoves++;
        checkTileMatch(arrPicks[0], arrPicks[1]);
      }
    }
  }
});

/**
 * Sounds & effects playback
 */
const tileSwipeSoundEffect = new Audio('./sound_effects/select_tile_sound.ogg');
const matchSoundEffect = new Audio('./sound_effects/match_sound.ogg');
const winSoundEffect = new Audio('./sound_effects/game_win_sound.ogg');
const defeatSoundEffect = new Audio('./sound_effects/losing_sound.ogg');

const playSoundEffect = (soundEffect) => {
  soundEffect.volume = 0.05;
  soundEffect.currentTime = 0;
  soundEffect.play();
};

const allSoundEffectsArray = [
  tileSwipeSoundEffect,
  matchSoundEffect,
  winSoundEffect,
  defeatSoundEffect,
];

const muteAllAudio = (mute = true) => {
  allSoundEffectsArray.forEach((sfx) => (sfx.muted = mute ? true : false));
};

let audioMuted = false;
window.addEventListener('keydown', (event) => {
  switch (event.code) {
    // Center the camera
    case 'Space':
      cameraCenter(0.5, new THREE.Vector3(0, 0, 5));
      break;
    // Restart currently played level
    case 'KeyR':
      loadLevel(activeLevel, activeDifficulty);
      break;
    // Mute or unmute audio upon clicking 'M' on the keyboard
    case 'KeyM':
      !audioMuted ? muteAllAudio(true) : muteAllAudio(false);
      audioMuted = !audioMuted;
      break;
  }
});

/**
 * Loaders, textures, geometries, materials
 */
const textureLoader = new THREE.TextureLoader();

// Geometry & materials
const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.15);
const normalMaterial = new THREE.MeshNormalMaterial();
const questionMarkMaterial = new THREE.MeshBasicMaterial({
  map: textureLoader.load('./question_mark.png'),
});

/**
 * Meshes section
 */
const disposeResources = () => {
  if (group.children.length) {
    group.traverse((child) => {
      if (child.isMesh && child instanceof THREE.Mesh) {
        for (const key in child.material) {
          const value = child.material[key];

          if (value.type === 'MeshBasicMaterial') {
            value.map.dispose();
          }
        }
      }
    });

    group.children = [];
  }
};

// Group for tile meshes
let group = new THREE.Group();

const loadLevel = (levelType = 0, difficulty = 0, delay = 0) => {
  // Hide "restart" modal if visible
  containerRestartElement.classList.contains('visible') &&
    containerRestartElement.classList.remove('visible');

  // Clear the scene if it was already filled with textures
  disposeResources();

  // Clear data from previous game
  checkMatchNegativeRef && clearTimeout(checkMatchNegativeRef);
  numberOfMoves = 0;
  numberOfMatches = 0;
  arrPicks = [];

  // Assign level and difficulty upon button clicks
  activeLevel = levelType;
  activeDifficulty = difficulty;

  // Update initial level time
  initialTime = activeLevel === 0 ? 60 : activeLevel === 1 ? 90 : activeLevel === 2 ? 120 : 150;

  // Stop the timer clock & bring ability to play
  continueToPlay = true;
  timerClock.stop();
  !timerClock.running && window.cancelAnimationFrame(timerClockRef);
  timerElement.innerHTML = initialTime;

  // Number of tiles depends on selected levelType (possible values: [0, 1, 2])
  const numberOfTiles =
    levelType === 0
      ? 12
      : levelType === 1
      ? 18
      : levelType === 2
      ? 24
      : levelType === 3
      ? 32
      : null;

  matchesToWin = numberOfTiles / 2;

  // Animals available to pick with certain difficulty chosen
  let optionsToChoose = JSON.parse(
    JSON.stringify(animals.filter((animal) => animal.difficulty === difficulty))
  );

  // Meshes
  for (let i = 0; i < matchesToWin; i++) {
    const pick = optionsToChoose[Math.floor(Math.random() * optionsToChoose.length)];
    pick.chosen = true;

    const { id, enName, imagePath, textPath, difficulty } = pick;

    // First mesh with animal image
    const meshAnimalImage = new THREE.Mesh(geometry, [
      normalMaterial,
      normalMaterial,
      normalMaterial,
      normalMaterial,
      questionMarkMaterial,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: textureLoader.load(imagePath, (texture) => {
          texture.encoding = THREE.sRGBEncoding;
        }),
      }),
    ]);

    meshAnimalImage.gameProps = {
      id,
      enName,
      imagePath,
      textPath,
      difficulty,
      selected: false,
      match: false,
    };
    group.add(meshAnimalImage);

    // Second mesh with animal name
    const meshAnimalText = new THREE.Mesh(geometry, [
      normalMaterial,
      normalMaterial,
      normalMaterial,
      normalMaterial,
      questionMarkMaterial,
      new THREE.MeshBasicMaterial({
        map: textureLoader.load(textPath, (texture) => {
          texture.encoding = THREE.sRGBEncoding;
        }),
      }),
    ]);

    meshAnimalText.gameProps = {
      id,
      enName,
      imagePath,
      textPath,
      difficulty,
      selected: false,
      match: false,
    };
    group.add(meshAnimalText);

    optionsToChoose = optionsToChoose.filter((animal) => !animal.chosen);
  }

  // Shuffles meshes in the group
  group.children.sort(() => Math.random() - 0.5);

  switch (levelType) {
    case 0:
      for (let i = 0; i < numberOfTiles; i++) {
        if (i < 4) {
          group.children[i].position.x = -1.125 + i * 0.75;
          group.children[i].position.y = -0.6;
        } else if (i >= 4 && i < 8) {
          group.children[i].position.x = -1.125 + (i % 4) * 0.75;
          group.children[i].position.y = 0;
        } else if (i >= 8 && i < numberOfTiles) {
          group.children[i].position.x = -1.125 + (i % 8) * 0.75;
          group.children[i].position.y = 0.6;
        }
      }
      if (isMobile) cameraZoomIn(1, 2.5, delay);
      else {
        cameraZoomIn(1, 1.75, delay);
        cameraCenter();
      }
      break;

    case 1:
      for (let i = 0; i < numberOfTiles; i++) {
        if (i < 6) {
          group.children[i].position.x = -1.875 + i * 0.75;
          group.children[i].position.y = -0.6;
        } else if (i >= 6 && i < 12) {
          group.children[i].position.x = -1.875 + (i % 6) * 0.75;
          group.children[i].position.y = 0;
        } else if (i >= 12 && i < numberOfTiles) {
          group.children[i].position.x = -1.875 + (i % 12) * 0.75;
          group.children[i].position.y = 0.6;
        }
      }
      if (isMobile) cameraZoomIn(1, 1.8, delay);
      else {
        cameraZoomIn(1, 1.6, delay);
        cameraCenter();
      }
      break;

    case 2:
      for (let i = 0; i < numberOfTiles; i++) {
        if (i < 6) {
          group.children[i].position.x = -1.875 + i * 0.75;
          group.children[i].position.y = -0.9;
        } else if (i >= 6 && i < 12) {
          group.children[i].position.x = -1.875 + (i % 6) * 0.75;
          group.children[i].position.y = -0.3;
        } else if (i >= 12 && i < 18) {
          group.children[i].position.x = -1.875 + (i % 12) * 0.75;
          group.children[i].position.y = 0.3;
        } else if (i >= 18 && i < numberOfTiles) {
          group.children[i].position.x = -1.875 + (i % 18) * 0.75;
          group.children[i].position.y = 0.9;
        }
      }
      if (isMobile) cameraZoomIn(1, 1.7, delay);
      else {
        cameraZoomIn(1, 1.5, delay);
        cameraCenter();
      }
      break;

    case 3:
      for (let i = 0; i < numberOfTiles; i++) {
        if (i < 8) {
          group.children[i].position.x = -2.625 + i * 0.75;
          group.children[i].position.y = -0.9;
        } else if (i >= 8 && i < 16) {
          group.children[i].position.x = -2.625 + (i % 8) * 0.75;
          group.children[i].position.y = -0.3;
        } else if (i >= 16 && i < 24) {
          group.children[i].position.x = -2.625 + (i % 16) * 0.75;
          group.children[i].position.y = 0.3;
        } else if (i >= 24 && i < numberOfTiles) {
          group.children[i].position.x = -2.625 + (i % 24) * 0.75;
          group.children[i].position.y = 0.9;
        }
      }
      if (isMobile) cameraZoomIn(1, 1.4, delay);
      else {
        cameraZoomIn(1, 1.4, delay);
        cameraCenter();
      }
      break;

    default:
      break;
  }

  scene.add(group);
};

// By default loads in level 1, with beginner difficulty, if no information was provided
loadLevel(activeLevel, activeDifficulty, 1);

// Update timer clock
const refreshTimerClock = () => {
  timeLeft = parseInt((initialTime - timerClock.getElapsedTime()).toFixed());
  timerElement.innerHTML = timeLeft;

  timerClockRef = window.requestAnimationFrame(refreshTimerClock);

  if (!timeLeft) {
    gameLoose();
    timerClock.stop();
    window.cancelAnimationFrame(timerClockRef);
  }
};

// After user lost due to time limit
const gameLoose = () => {
  cameraCenter();

  userScore = 0;
  continueToPlay = false;

  if (arrPicks.length === 1) {
    hideTile(arrPicks[0]);
    playSoundEffect(tileSwipeSoundEffect);
  }

  window.setTimeout(() => {
    playSoundEffect(defeatSoundEffect);
    group.children.forEach(
      (child) =>
        (child.gameProps.selected || child.gameProps.match) &&
        changeTileColor(child.material[5].color, lossColor, 0.5)
    );

    // Show restart button
    containerRestartElement.classList.add('visible');
    restartElement.textContent = `Restart`;
  }, 1000);
};

// After user won the game
const gameWin = () => {
  cameraCenter();

  userScore = parseInt(
    (
      ((timeLeft * 100) / numberOfMoves) *
      matchesToWin *
      (activeDifficulty === 2 ? 1.3 : activeDifficulty === 1 ? 1.15 : 1)
    ).toFixed()
  );
  numberOfMatches = 0;
  continueToPlay = false;
  timerClock.stop();
  !timerClock.running && window.cancelAnimationFrame(timerClockRef);

  if (
    window.localStorage.getItem('highestScoreMemory') &&
    parseInt(window.localStorage.getItem('highestScoreMemory')) < userScore
  )
    window.localStorage.setItem('highestScoreMemory', userScore);
  else if (!window.localStorage.getItem('highestScoreMemory'))
    window.localStorage.setItem('highestScoreMemory', userScore);

  window.setTimeout(() => {
    playSoundEffect(winSoundEffect);
    group.children.forEach(
      (child) =>
        (child.gameProps.selected || child.gameProps.match) &&
        changeTileColor(child.material[5].color, winColor, 0.5)
    );

    // Show user score & restart button
    containerRestartElement.classList.add('visible');
    restartElement.textContent = window.localStorage.getItem('highestScoreMemory')
      ? `Score: ${userScore} | Highest score: ${window.localStorage.getItem(
          'highestScoreMemory'
        )} | Restart`
      : `Score: ${userScore} | Restart`;
  }, 1000);
};

/**
 * Animation section
 */
const animateClock = new THREE.Clock();
const animate = () => {
  // Call animate upon next frame
  window.requestAnimationFrame(animate);

  // Elapsed time from the start of experience
  const elapsedTime = animateClock.getElapsedTime();

  // Update orbit controls camera
  controls.update();

  // Update ray with camera and pointer position
  raycaster.setFromCamera(pointer, camera);

  // Animate group of meshes to slowly float
  if (group.children.length) {
    group.rotation.x = Math.sin(elapsedTime) * 0.03;
    group.rotation.y = Math.cos(elapsedTime) * 0.03;

    // Update objects intersecting with the ray if the game has not ended yet
    if (continueToPlay) intersects = raycaster.intersectObjects(group.children);
    else intersects = [];

    if (!isMobile) {
      intersects.length && !intersects[0].object.gameProps.selected && continueToPlay
        ? (canvas.style.cursor = 'pointer')
        : (canvas.style.cursor = 'default');
    }
  }

  // Check if the player won
  numberOfMatches === matchesToWin && gameWin();

  // Show valuable information
  // if (
  //   renderer &&
  //   (renderer.info.memory.geometries ||
  //     renderer.info.programs ||
  //     renderer.info.render ||
  //     renderer.info.memory.textures)
  // ) {
  //   console.log(
  //     'geometries=' + renderer.info.memory.geometries + ' textures=' + renderer.info.memory.textures
  //   );
  // }

  // Update renderer
  renderer.render(scene, camera);
};
animate();
