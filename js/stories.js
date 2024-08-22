"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */
async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/* A render method to render HTML for an individual Story instance
 * Returns the markup for the story. */
function generateStoryMarkup(story, showDeleteBtn = false) {

  const hostName = story.getHostName();
  const showStar = Boolean(currentUser);

  return $(`
      <li id="${story.storyId}">
        ${showDeleteBtn ? getDeleteBtnHTML() : ""}
        ${showStar ? getStarHTML(story, currentUser) : ""}
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}

// Makes the delete button for the HTML
function getDeleteBtnHTML() {
  return `
  <span class="trash-can">
    <i class="fas fa-trash-alt"></i>
  </span>`;
}

// Makes the star for each story
function getStarHTML(story, user) {
  const isFavorite = user.isFavorite(story);
  const starType = isFavorite ? "fas" : "far";
  return `
  <span class="star">
    <i class="${starType} fa-star"></i>
  </span>`;
}

/** Gets list of stories from server, generates their HTML, and puts on page. */
function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  updateStarShading();
  $allStoriesList.show();
}

// Submits a new story when a user clicks submit and adds it immediately to the page
async function submitNewStory(evt) {
  const title = $("#create-title").val().trim();
  const author = $("#create-author").val().trim();
  const url = $("#create-url").val().trim();

  if (!title || !author || !url) return;

  console.debug("submitNewStory", evt);

  const newStory = await storyList.addStory(currentUser, {
    title,
    author,
    url,
  });

  currentUser.ownStories.push(newStory);

  await getAndShowStoriesOnStart();

  $("#create-author").val("");
  $("#create-title").val("");
  $("#create-url").val("");

  setTimeout(() => {
    $submitForm.hide();
  }, 500);
}
$body.on("click", "#submit-form button", submitNewStory);

// Deletes a story when a user clicks the trash can next to a story
async function deleteStory(evt) {
  console.debug("deleteStory");

  const $closestLi = $(evt.target).closest("li");
  const storyId = $closestLi.attr("id");

  await storyList.removeStory(currentUser, storyId);

  await putUserStoriesOnPage();
}
$ownStories.on("click", ".trash-can", deleteStory);

// Puts favorites on page when navbar 'favorites' is clicked
function putFavoritesListOnPage() {
  console.debug("putFavoritesListOnPage");

  $favoritedStories.empty();

  // append the favorited stories to the element
  if (currentUser.favorites.length === 0) {
    $favoritedStories.append("<h5>No favorites added!</h5>");
  } else {
    currentUser.favorites.forEach((story) => {
      const $story = generateStoryMarkup(story);
      $favoritedStories.append($story);
    });
  }

  updateStarShading();
  $favoritedStories.show();
}

// Puts user stories on page when navbar 'my stories' is clicked
function putUserStoriesOnPage() {
  console.debug("putUserStoriesOnPage");
  
  $ownStories.empty();

  if (currentUser.ownStories.length === 0) {
    $ownStories.append("<h5>No stories added by user yet!</h5>");
  } else {
    currentUser.ownStories.forEach((story) => {
      let $story = generateStoryMarkup(story, true);
      $ownStories.append($story);
    });
  }

  $ownStories.show();
}

// Maintains the proper shading for the favorited stories when the user switches pages or refreshes.
function updateStarShading() {
  if (!currentUser) return;

  const favoriteStoryIds = currentUser.favorites.map((story) => story.storyId);
  $(".star i").each(function () {
    const storyId = $(this).closest("li").attr("id");
    if (favoriteStoryIds.includes(storyId)) {
      $(this).removeClass("far").addClass("fas");
    } else {
      $(this).removeClass("fas").addClass("far");
    }
  });
}

// Handles clicking on a star to favorite/unfavorite a story
$body.on("click", ".star i", async (e) => {
  const storyId = $(e.target).closest("li").attr("id");
  const story = storyList.stories.find((story) => story.storyId === storyId);
  const currentFavorites = await currentUser.toggleFavoriteStory(
    currentUser,
    story
  );
  currentUser.favorites = currentFavorites;

  updateStarShading();
});
