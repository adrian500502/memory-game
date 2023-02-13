import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { THREEx } from './util/THREEx.FullScreen.js';
import gsap from 'gsap';
import animals from './animals.js';
import { setUserGameScore } from './api/apiMethods.js';
import { getDifficultyName } from './api/apiFormatter.js';

export default class MemoryGame {
  constructor(difficultyFromApi = 0, externalLogin = false) {
    this.init(difficultyFromApi, externalLogin);
    this.loadLevel(1, difficultyFromApi);
  }

  isMobile = /Android|iOS|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  containerRestartElement = document.querySelector('.container-restart');
  restartElement = document.getElementById('restart');

  checkMatchNegativeRef;
  intersects = [];
  arrPicks = [];
  numberOfMoves = 0;
  numberOfMatches = 0;
  matchesToWin = null;
  continueToPlay = true;
  userScore = 0;
  activeLevel = 0;
  activeDifficulty = 0;
  timerElement = document.getElementById('timer');
  timerClock = new THREE.Clock(false);
  initialTime = null;
  timeLeft = null;
  timerClockRef = null;

  scene = new THREE.Scene();
  sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  camera = new THREE.PerspectiveCamera(60, this.sizes.width / this.sizes.height, 0.1, 50);
  group = new THREE.Group();

  textureLoader = new THREE.TextureLoader();
  geometry = new THREE.BoxGeometry(0.5, 0.5, 0.15);
  normalMaterial = new THREE.MeshNormalMaterial();
  questionMarkMaterial = new THREE.MeshBasicMaterial({
    map: this.textureLoader.load('./pictures/question_mark.png'),
  });

  // Smooth camera scroll-in animation
  cameraZoomIn = (duration = 1, zoom = 1.75, delay = 0.5) => {
    gsap.to(this.camera, {
      duration,
      zoom,
      delay,
      onUpdate: () => {
        this.camera.updateProjectionMatrix();
      },
    });
  };

  // Center camera animation
  cameraCenter = (duration = 0.5, vector3 = { x: 0, y: 0, z: 5 }) => {
    gsap.to(this.camera.position, {
      duration,
      x: vector3.x,
      y: vector3.y,
      z: vector3.z,
      onUpdate: () => {
        this.camera.updateProjectionMatrix();
      },
    });
  };

  init = (difficultyFromApi, externalLogin) => {
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

    switch (difficultyFromApi) {
      case 0:
        difficultiesElementsArray[0].style.backgroundColor = 'lightskyblue';
        difficultiesElementsArray[1].style.backgroundColor = 'rgb(255, 255, 255)';
        difficultiesElementsArray[2].style.backgroundColor = 'rgb(255, 255, 255)';
        break;
      case 1:
        difficultiesElementsArray[0].style.backgroundColor = 'rgb(255, 255, 255)';
        difficultiesElementsArray[1].style.backgroundColor = 'lightskyblue';
        difficultiesElementsArray[2].style.backgroundColor = 'rgb(255, 255, 255)';
        break;
      case 2:
        difficultiesElementsArray[0].style.backgroundColor = 'rgb(255, 255, 255)';
        difficultiesElementsArray[1].style.backgroundColor = 'rgb(255, 255, 255)';
        difficultiesElementsArray[2].style.backgroundColor = 'lightskyblue';
        break;
      default:
        break;
    }

    for (let i = 0; i < levelElementsArray.length; i++) {
      levelElementsArray[i].addEventListener('click', () => {
        this.loadLevel(i, this.activeDifficulty);
        levelElementsArray.forEach(
          (levelElement) => (levelElement.style.backgroundColor = 'rgb(255, 255, 255)')
        );
        window.getComputedStyle(levelElementsArray[i]).backgroundColor === 'rgb(255, 255, 255)' &&
          (levelElementsArray[i].style.backgroundColor = 'yellowgreen');
      });
    }

    for (let i = 0; i < difficultiesElementsArray.length; i++) {
      difficultiesElementsArray[i].addEventListener('click', () => {
        this.loadLevel(this.activeLevel, i);
        difficultiesElementsArray.forEach(
          (difficultyElement) => (difficultyElement.style.backgroundColor = 'rgb(255, 255, 255)')
        );
        window.getComputedStyle(difficultiesElementsArray[i]).backgroundColor ===
          'rgb(255, 255, 255)' &&
          (difficultiesElementsArray[i].style.backgroundColor = 'lightskyblue');
      });
    }

    // Container restart element
    this.restartElement.addEventListener('click', () =>
      this.loadLevel(this.activeLevel, this.activeDifficulty)
    );

    // Full screen when "f" key is pressed
    THREEx.FullScreen.bindKey({ charCode: 'f'.charCodeAt(0) });

    // Check if user is on mobile device

    // Canvas
    const canvas = document.querySelector('canvas.webgl');

    // Scene

    // Sizes

    // Perspective camera

    !this.isMobile ? (this.camera.position.z = 5) : (this.camera.position.z = 15);
    this.scene.add(this.camera);

    // OrbitControls
    const controls = new OrbitControls(this.camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.minAzimuthAngle = -Math.PI / 3;
    controls.maxAzimuthAngle = Math.PI / 3;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(this.sizes.width, this.sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // When window is resized
    window.addEventListener('resize', () => {
      // Update sizes
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      // Update camera
      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      // Update renderer
      renderer.setSize(this.sizes.width, this.sizes.height);
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
    const lossColor = new THREE.Color('#ff0000');
    const matchColor = new THREE.Color('#00ff00');
    const winColor = new THREE.Color('#ff8c00');

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
      if (!this.timerClock.running) {
        this.timerClock.start();
        this.timerClockRef = refreshTimerClock();
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

    const checkTileMatch = (firstPick, secondPick) => {
      this.continueToPlay = false;

      if (
        this.timerClock.running &&
        this.arrPicks.length === 2 &&
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

        this.numberOfMatches++;
        this.arrPicks = [];
        this.timeLeft !== 0 && (this.continueToPlay = true);
      } else {
        this.arrPicks = [];

        this.checkMatchNegativeRef = window.setTimeout(() => {
          hideTile(firstPick);
          hideTile(secondPick);

          this.timeLeft !== 0 && (this.continueToPlay = true);

          this.timerClock.running && playSoundEffect(tileSwipeSoundEffect);
        }, 2000);
      }
    };

    // Listens to mouse event and checks if a tile has been selected
    canvas.addEventListener('click', (event) => {
      if (event.button === 0 && this.intersects.length && this.continueToPlay) {
        const mesh = this.intersects[0].object;

        if (!mesh.gameProps.selected && !mesh.gameProps.match) {
          showTile(mesh);
          this.arrPicks.push(mesh);

          if (this.arrPicks.length === 2) {
            this.numberOfMoves++;
            checkTileMatch(this.arrPicks[0], this.arrPicks[1]);
          }
        }
      }
    });

    /**
     * Sounds & effects playback
     */
    const tileSwipeSoundEffect = new Audio('./sounds/select_tile_sound.ogg');
    const matchSoundEffect = new Audio('./sounds/match_sound.ogg');
    const winSoundEffect = new Audio('./sounds/game_win_sound.ogg');
    const defeatSoundEffect = new Audio('./sounds/losing_sound.ogg');

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
          this.cameraCenter(0.5, new THREE.Vector3(0, 0, 5));
          break;
        // Restart currently played level
        case 'KeyR':
          this.loadLevel(this.activeLevel, this.activeDifficulty);
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

    // Geometry & materials

    /**
     * Meshes section
     */
    // By default loads in level 1, with beginner difficulty, if no information was provided
    // loadLevel(this.activeLevel, this.activeDifficulty, 1);

    // Update timer clock
    const refreshTimerClock = () => {
      this.timeLeft = parseInt((this.initialTime - this.timerClock.getElapsedTime()).toFixed());
      this.timerElement.innerHTML = this.timeLeft;

      this.timerClockRef = window.requestAnimationFrame(refreshTimerClock);

      if (!this.timeLeft) {
        gameLoose();
        this.timerClock.stop();
        window.cancelAnimationFrame(this.timerClockRef);
      }
    };

    // After user lost due to time limit
    const gameLoose = () => {
      this.cameraCenter();

      this.userScore = 0;
      this.continueToPlay = false;

      if (this.arrPicks.length === 1) {
        hideTile(this.arrPicks[0]);
        playSoundEffect(tileSwipeSoundEffect);
      }

      window.setTimeout(() => {
        playSoundEffect(defeatSoundEffect);
        this.group.children.forEach(
          (child) =>
            (child.gameProps.selected || child.gameProps.match) &&
            changeTileColor(child.material[5].color, lossColor, 0.5)
        );

        // Show restart button
        this.containerRestartElement.classList.add('visible');
        this.restartElement.textContent = `Restart`;
      }, 1000);
    };

    // After user won the game
    const gameWin = () => {
      this.cameraCenter();

      this.userScore = parseInt(
        (
          ((this.timeLeft * 100) / this.numberOfMoves) *
          this.matchesToWin *
          (this.activeDifficulty === 2 ? 1.3 : this.activeDifficulty === 1 ? 1.15 : 1)
        ).toFixed()
      );

      if (externalLogin) {
        setUserGameScore(
          {
            score: this.userScore,
            level: `${this.activeLevel + 1}`,
            difficulty: getDifficultyName(this.activeDifficulty),
            time: +this.timerClock.getElapsedTime().toFixed(2),
          },
          window.localStorage.getItem('apiTokenMemory')
        );
      }

      this.numberOfMatches = 0;
      this.continueToPlay = false;
      this.timerClock.stop();
      !this.timerClock.running && window.cancelAnimationFrame(this.timerClockRef);

      if (
        window.localStorage.getItem('highestScoreMemory') &&
        parseInt(window.localStorage.getItem('highestScoreMemory')) < this.userScore
      )
        window.localStorage.setItem('highestScoreMemory', this.userScore);
      else if (!window.localStorage.getItem('highestScoreMemory'))
        window.localStorage.setItem('highestScoreMemory', this.userScore);

      window.setTimeout(() => {
        playSoundEffect(winSoundEffect);
        this.group.children.forEach(
          (child) =>
            (child.gameProps.selected || child.gameProps.match) &&
            changeTileColor(child.material[5].color, winColor, 0.5)
        );

        // Show user score & restart button
        this.containerRestartElement.classList.add('visible');
        this.restartElement.textContent = window.localStorage.getItem('highestScoreMemory')
          ? `Score: ${this.userScore} | Highest score: ${window.localStorage.getItem(
              'highestScoreMemory'
            )} | Restart`
          : `Score: ${this.userScore} | Restart`;
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
      raycaster.setFromCamera(pointer, this.camera);

      // Animate group of meshes to slowly float
      if (this.group.children.length) {
        this.group.rotation.x = Math.sin(elapsedTime) * 0.03;
        this.group.rotation.y = Math.cos(elapsedTime) * 0.03;

        // Update objects intersecting with the ray if the game has not ended yet
        if (this.continueToPlay) this.intersects = raycaster.intersectObjects(this.group.children);
        else this.intersects = [];

        if (!this.isMobile) {
          this.intersects.length &&
          !this.intersects[0].object.gameProps.selected &&
          this.continueToPlay
            ? (canvas.style.cursor = 'pointer')
            : (canvas.style.cursor = 'default');
        }
      }

      // Check if the player won
      this.numberOfMatches === this.matchesToWin && gameWin();

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
      renderer.render(this.scene, this.camera);
    };
    animate();
  };

  disposeResources = () => {
    if (this.group.children.length) {
      this.group.traverse((child) => {
        if (child.isMesh && child instanceof THREE.Mesh) {
          for (const key in child.material) {
            const value = child.material[key];

            if (value.type === 'MeshBasicMaterial') {
              value.map.dispose();
            }
          }
        }
      });

      this.group.children = [];
    }
  };

  loadLevel = (levelType = 0, levelDifficulty = 0, delay = 0) => {
    // Hide "restart" modal if visible
    this.containerRestartElement.classList.contains('visible') &&
      this.containerRestartElement.classList.remove('visible');

    // Clear the scene if it was already filled with textures
    this.disposeResources();

    // Clear data from previous game
    this.checkMatchNegativeRef && window.clearTimeout(this.checkMatchNegativeRef);
    this.numberOfMoves = 0;
    this.numberOfMatches = 0;
    this.arrPicks = [];

    // Assign level and difficulty upon button clicks
    this.activeLevel = levelType;
    this.activeDifficulty = levelDifficulty;

    // Update initial level time
    this.initialTime =
      this.activeLevel === 0
        ? 60
        : this.activeLevel === 1
        ? 90
        : this.activeLevel === 2
        ? 120
        : 150;

    // Stop the timer clock & bring ability to play
    this.continueToPlay = true;
    this.timerClock.stop();
    !this.timerClock.running && window.cancelAnimationFrame(this.timerClockRef);
    this.timerElement.innerHTML = this.initialTime;

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

    this.matchesToWin = numberOfTiles / 2;

    // Animals available to pick with certain difficulty chosen
    let optionsToChoose = JSON.parse(
      JSON.stringify(animals.filter((animal) => animal.difficulty === levelDifficulty))
    );

    // Meshes
    for (let i = 0; i < this.matchesToWin; i++) {
      const pick = optionsToChoose[Math.floor(Math.random() * optionsToChoose.length)];
      pick.chosen = true;

      const { id, enName, imagePath, textPath, difficulty } = pick;

      // First mesh with animal image
      const meshAnimalImage = new THREE.Mesh(this.geometry, [
        this.normalMaterial,
        this.normalMaterial,
        this.normalMaterial,
        this.normalMaterial,
        this.questionMarkMaterial,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: this.textureLoader.load(imagePath, (texture) => {
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
      this.group.add(meshAnimalImage);

      // Second mesh with animal name
      const meshAnimalText = new THREE.Mesh(this.geometry, [
        this.normalMaterial,
        this.normalMaterial,
        this.normalMaterial,
        this.normalMaterial,
        this.questionMarkMaterial,
        new THREE.MeshBasicMaterial({
          map: this.textureLoader.load(textPath, (texture) => {
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
      this.group.add(meshAnimalText);

      optionsToChoose = optionsToChoose.filter((animal) => !animal.chosen);
    }

    // Shuffles meshes in the group
    this.group.children.sort(() => Math.random() - 0.5);

    switch (levelType) {
      case 0:
        for (let i = 0; i < numberOfTiles; i++) {
          if (i < 4) {
            this.group.children[i].position.x = -1.125 + i * 0.75;
            this.group.children[i].position.y = -0.6;
          } else if (i >= 4 && i < 8) {
            this.group.children[i].position.x = -1.125 + (i % 4) * 0.75;
            this.group.children[i].position.y = 0;
          } else if (i >= 8 && i < numberOfTiles) {
            this.group.children[i].position.x = -1.125 + (i % 8) * 0.75;
            this.group.children[i].position.y = 0.6;
          }
        }
        if (this.isMobile) this.cameraZoomIn(1, 2.5, delay);
        else {
          this.cameraZoomIn(1, 1.75, delay);
          this.cameraCenter();
        }
        break;

      case 1:
        for (let i = 0; i < numberOfTiles; i++) {
          if (i < 6) {
            this.group.children[i].position.x = -1.875 + i * 0.75;
            this.group.children[i].position.y = -0.6;
          } else if (i >= 6 && i < 12) {
            this.group.children[i].position.x = -1.875 + (i % 6) * 0.75;
            this.group.children[i].position.y = 0;
          } else if (i >= 12 && i < numberOfTiles) {
            this.group.children[i].position.x = -1.875 + (i % 12) * 0.75;
            this.group.children[i].position.y = 0.6;
          }
        }
        if (this.isMobile) this.cameraZoomIn(1, 1.8, delay);
        else {
          this.cameraZoomIn(1, 1.6, delay);
          this.cameraCenter();
        }
        break;

      case 2:
        for (let i = 0; i < numberOfTiles; i++) {
          if (i < 6) {
            this.group.children[i].position.x = -1.875 + i * 0.75;
            this.group.children[i].position.y = -0.9;
          } else if (i >= 6 && i < 12) {
            this.group.children[i].position.x = -1.875 + (i % 6) * 0.75;
            this.group.children[i].position.y = -0.3;
          } else if (i >= 12 && i < 18) {
            this.group.children[i].position.x = -1.875 + (i % 12) * 0.75;
            this.group.children[i].position.y = 0.3;
          } else if (i >= 18 && i < numberOfTiles) {
            this.group.children[i].position.x = -1.875 + (i % 18) * 0.75;
            this.group.children[i].position.y = 0.9;
          }
        }
        if (this.isMobile) this.cameraZoomIn(1, 1.7, delay);
        else {
          this.cameraZoomIn(1, 1.5, delay);
          this.cameraCenter();
        }
        break;

      case 3:
        for (let i = 0; i < numberOfTiles; i++) {
          if (i < 8) {
            this.group.children[i].position.x = -2.625 + i * 0.75;
            this.group.children[i].position.y = -0.9;
          } else if (i >= 8 && i < 16) {
            this.group.children[i].position.x = -2.625 + (i % 8) * 0.75;
            this.group.children[i].position.y = -0.3;
          } else if (i >= 16 && i < 24) {
            this.group.children[i].position.x = -2.625 + (i % 16) * 0.75;
            this.group.children[i].position.y = 0.3;
          } else if (i >= 24 && i < numberOfTiles) {
            this.group.children[i].position.x = -2.625 + (i % 24) * 0.75;
            this.group.children[i].position.y = 0.9;
          }
        }
        if (this.isMobile) this.cameraZoomIn(1, 1.4, delay);
        else {
          this.cameraZoomIn(1, 1.4, delay);
          this.cameraCenter();
        }
        break;

      default:
        break;
    }

    this.scene.add(this.group);
  };
}
