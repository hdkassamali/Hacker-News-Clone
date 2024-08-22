"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system */
class Story {
  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */
  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */
  getHostName() {
    const url = new URL(this.url);
    return url.hostname;
  }
}

/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM. */
class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */
  static async getStories() {
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map((story) => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   * Returns the new Story instance
   */
  async addStory(user, newStory) {
    const token = user.loginToken;

    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {
        token,
        story: {
          author: newStory.author,
          title: newStory.title,
          url: newStory.url,
        },
      },
    });

    return new Story(response.data.story);
  }

  // Deletes a story and removes the story from the story list, the user's own stories, and the user's favorites list
  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: { token: user.loginToken },
    });

    this.stories = this.stories.filter((story) => story.storyId !== storyId);

    user.ownStories = user.ownStories.filter(
      (story) => story.storyId !== storyId
    );

    user.favorites = user.favorites.filter(
      (story) => story.storyId !== storyId
    );
  }
}

/******************************************************************************
 * User: a user in the system (only used to represent the current user) */
class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */
  constructor(
    { username, name, createdAt, favorites = [], ownStories = [] },
    token
  ) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map((s) => new Story(s));
    this.ownStories = ownStories.map((s) => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it. */
  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories,
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.*/
  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories,
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *  we can log them in automatically. This function does that. */
  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories,
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  // Handles the functionality to favorite/unfavorite a story
  async toggleFavoriteStory(currentUser, storyToFavorite) {
    console.debug("toggleFavoriteStory");
    let response;

    const storyInFavoriteList = currentUser.favorites.some(
      (favorite) => favorite.storyId === storyToFavorite.storyId
    );

    if (!storyInFavoriteList) {
      response = await axios({
        url: `${BASE_URL}/users/${currentUser.username}/favorites/${storyToFavorite.storyId}`,
        method: "POST",
        data: { token: currentUser.loginToken },
      });
    } else {
      response = await axios({
        url: `${BASE_URL}/users/${currentUser.username}/favorites/${storyToFavorite.storyId}`,
        method: "DELETE",
        data: { token: currentUser.loginToken },
      });
    }

    currentUser.favorites = response.data.user.favorites.map(
      (story) => new Story(story)
    );

    return currentUser.favorites;
  }

  // Returns true if current story is in favorites
  isFavorite(story) {
    return this.favorites.some((s) => s.storyId === story.storyId);
  }
}
