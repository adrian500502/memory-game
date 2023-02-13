import MemoryGame from './MemoryGame.js';
import { postUserCredentials } from './api/apiMethods.js';
import { getDifficultyNumber } from './api/apiFormatter.js';

const formElement = document.querySelector('.portal-login');
const containerElement = document.querySelector('.container');
const canvasElement = document.querySelector('.webgl');

const usernameInputElement = document.getElementById('username');
const passwordInputElement = document.getElementById('password');
const inputElements = [usernameInputElement, passwordInputElement];

const continueWithoutLoginButtonElement = document.getElementById('continue-without-login');
const messageInvalidElement = document.getElementById('message-invalid');

const makeExperienceElementsVisible = () => {
  containerElement.classList.add('visible');
  canvasElement.classList.remove('invisible');
};

formElement.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = usernameInputElement.value;
  const password = passwordInputElement.value;

  postUserCredentials(username, password).then((response) => {
    const { data } = response;

    if (response.status === 200) {
      const token = data.token;
      const difficulty = data.quizResult.difficulty;

      window.localStorage.setItem('apiTokenMemory', `Bearer ${token}`);
      window.localStorage.setItem(
        'apiMemoryDifficulty',
        `${difficulty !== undefined ? difficulty : 'beginner'}`
      );

      formElement.classList.remove('visible');
      inputElements.forEach((el) => el.classList.remove('input-invalid'));

      new MemoryGame(getDifficultyNumber(difficulty), true);
      makeExperienceElementsVisible();
    } else if (response.status === 400) {
      inputElements.forEach((el) => el.classList.add('input-invalid'));
      messageInvalidElement.style.display = 'block';
      messageInvalidElement.textContent = 'Wpisz login i hasło';
    } else if (response.status === 401) {
      inputElements.forEach((el) => el.classList.add('input-invalid'));
      messageInvalidElement.style.display = 'block';
      messageInvalidElement.textContent = 'Niepoprawny login lub hasło';
    }
  });
});

continueWithoutLoginButtonElement.addEventListener('click', () => {
  formElement.style.display = 'none';
  inputElements.forEach((el) => el.classList.remove('input-invalid'));

  new MemoryGame();
  makeExperienceElementsVisible();
});
