const axios = require('axios');

export const postUserCredentials = async (username, password) => {
  try {
    const response = await axios.post(
      'https://english-educational-app-backend.vercel.app/api/login',
      {
        username,
        password,
      }
    );

    return response;
  } catch (error) {
    return error.response;
  }
};

/**
 *
 * @param {*} payload object with following key-value pairs:
 * * "score": 213.33
 * * "level": "1",
 * * "difficulty": "beginner",
 * * "time": 13.35
 * @param {*} authorizationToken authentication token
 * @returns response
 */
export const setUserGameScore = async (payload, authorizationToken) => {
  try {
    const response = await axios.post(
      'https://english-educational-app-backend.vercel.app/api/games/setUserGameScore/memory',
      payload,
      {
        headers: {
          Authorization: authorizationToken,
        },
      }
    );
    return response;
  } catch (error) {
    return error.response;
  }
};
