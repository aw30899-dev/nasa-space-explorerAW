// Find the date pickers and set their default nine-day range.
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const pagination = document.getElementById('pagination');
const previousPageButton = document.getElementById('previousPage');
const nextPageButton = document.getElementById('nextPage');
const pageStatus = document.getElementById('pageStatus');
const photosPerPage = 9;
let currentPage = 1;
let totalPages = 1;

setupDateInputs(startInput, endInput);

const spaceFacts = [
  'A day on Venus is longer than its year.',
  'Neutron stars can spin around 600 times every second.',
  'There are more stars in the universe than grains of sand on Earth.',
  'The footprints left by Apollo astronauts can last for millions of years.',
  'Saturn would float in water because it is less dense than water.',
  'The Sun contains more than 99 percent of the mass in our solar system.',
  'One million Earths could fit inside the Sun.',
  'Jupiter has the shortest day of all the planets in our solar system.',
  'A year on Neptune lasts about 165 Earth years.'
];

document.getElementById('spaceFact').textContent =
  spaceFacts[Math.floor(Math.random() * spaceFacts.length)];

const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModal');

// Convert YYYY-MM-DD into the YYMMDD format used by NASA's date-range endpoint.
function toApiDate(date) {
  return date.replaceAll('-', '').slice(2);
}

function getImageFromHtml(html) {
  if (!html) {
    return '';
  }

  const documentFromHtml = new DOMParser().parseFromString(html, 'text/html');
  return documentFromHtml.querySelector('meta[property="og:image"]')?.content || '';
}

function getVideoFromHtml(html) {
  if (!html) {
    return '';
  }

  const documentFromHtml = new DOMParser().parseFromString(html, 'text/html');
  const videoFrame = documentFromHtml.querySelector('iframe[src]');
  const videoLink = documentFromHtml.querySelector('a[href*="youtube.com"], a[href*="youtu.be"]');
  const videoUrl = videoFrame?.src || videoLink?.href || '';

  return videoUrl.startsWith('//') ? `https:${videoUrl}` : videoUrl;
}

function getExplanation(html) {
  const htmlWithParagraphBreaks = (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|center|h[1-6])\s*>/gi, '\n');
  const documentFromHtml = new DOMParser().parseFromString(
    htmlWithParagraphBreaks,
    'text/html'
  );

  return documentFromHtml.body.textContent
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function showMessage(message, isError = false) {
  gallery.replaceChildren();
  pagination.hidden = true;
  const messageBox = document.createElement('div');
  messageBox.className = isError ? 'placeholder error-message' : 'placeholder';
  messageBox.textContent = message;
  gallery.append(messageBox);
}

function renderGallery(items) {
  gallery.replaceChildren();

  if (items.length === 0) {
    showMessage('No space photos were found for those dates. Try another range.');
    return;
  }

  // Show each page's photos in date order, from oldest to newest.
  items.sort((first, second) => first.date.localeCompare(second.date));

  items.forEach((item) => {
    const card = document.createElement('button');
    card.className = 'gallery-item';
    card.type = 'button';
    card.setAttribute('aria-label', `View ${item.title}, ${formatDate(item.date)}`);

    if (item.media_type === 'video') {
      const videoPreview = document.createElement('span');
      videoPreview.className = 'video-preview';
      videoPreview.innerHTML = '<span aria-hidden="true">&#9654;</span><span>Video</span>';
      card.append(videoPreview);
    } else {
      const image = document.createElement('img');
      image.src = item.imageUrl;
      image.alt = item.alt || item.title;
      image.loading = 'lazy';
      card.append(image);
    }

    const cardDetails = document.createElement('span');
    cardDetails.className = 'gallery-copy';

    const title = document.createElement('span');
    title.className = 'gallery-title';
    title.textContent = item.title;

    const date = document.createElement('time');
    date.className = 'gallery-date';
    date.dateTime = item.date;
    date.textContent = formatDate(item.date);

    cardDetails.append(title, date);
    card.append(cardDetails);
    card.addEventListener('click', () => openImageDetails(item));
    gallery.append(card);
  });
}

function updatePagination() {
  pagination.hidden = totalPages <= 1;
  pageStatus.textContent = `Page ${currentPage} of ${totalPages}`;
  previousPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
}

function openImageDetails(item) {
  const modalMedia = document.getElementById('modalMedia');
  const modalDate = document.getElementById('modalDate');
  const modalTitle = document.getElementById('modalTitle');
  const modalExplanation = document.getElementById('modalExplanation');
  const modalVideoLink = document.getElementById('modalVideoLink');

  modalMedia.replaceChildren();
  modalTitle.textContent = item.title;
  modalDate.textContent = formatDate(item.date);
  modalExplanation.textContent = item.explanation;
  modalVideoLink.hidden = item.media_type !== 'video' || !item.videoUrl;
  modalVideoLink.href = item.videoUrl || '';
  modalVideoLink.textContent = item.hasDirectVideo
    ? 'Watch this video in a new tab'
    : 'Open the NASA video page';

  if (item.media_type !== 'video' && item.imageUrl) {
    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = item.alt || item.title;
    modalMedia.append(image);
  } else if (item.media_type === 'video') {
    const videoMessage = document.createElement('p');
    videoMessage.className = 'video-preview modal-video-preview';
    videoMessage.innerHTML = '<span aria-hidden="true">&#9654;</span><span>NASA video</span>';
    modalMedia.append(videoMessage);
  }

  imageModal.showModal();
}

async function loadImages(page = 1) {
  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate || startDate > endDate) {
    showMessage('Choose a valid date range to explore the cosmos.', true);
    return;
  }

  gallery.setAttribute('aria-busy', 'true');
  gallery.innerHTML = `
    <div class="loading-state">
      <span class="loading-spinner" aria-hidden="true"></span>
      <p>Loading space photos...</p>
    </div>
  `;
  getImagesButton.disabled = true;
  previousPageButton.disabled = true;
  nextPageButton.disabled = true;
  pagination.hidden = true;

  try {
    const apiUrl = `https://science.nasa.gov/wp-json/wp/v2/apod-basic?date_from=${toApiDate(startDate)}&date_to=${toApiDate(endDate)}&page=${page}&per_page=${photosPerPage}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`NASA's photo service returned status ${response.status}.`);
    }

    const responseTotalPages = Number(response.headers.get('X-WP-TotalPages'));
    if (!Number.isInteger(responseTotalPages) || responseTotalPages < 1) {
      throw new Error('NASA did not provide valid pagination information. Please try again.');
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('NASA returned an unexpected response. Please try again.');
    }

    currentPage = page;
    totalPages = responseTotalPages;
    const photos = data.map((item) => {
      const mediaType = item.media_type || 'image';
      const videoFromHtml = getVideoFromHtml(item.basic_html);

      return {
        date: item.date,
        title: item.title || 'Untitled space photo',
        explanation: getExplanation(item.explanation),
        media_type: mediaType,
        imageUrl: item.hdurl || getImageFromHtml(item.basic_html) || '',
        videoUrl: videoFromHtml || item.video_url || item.url || item.permalink || '',
        hasDirectVideo: Boolean(
          videoFromHtml || item.video_url || (item.url && item.url !== item.permalink)
        ),
        alt: item.alt || ''
      };
    }).filter((item) => item.date);

    renderGallery(photos);
    if (photos.length > 0) {
      updatePagination();
    }
  } catch (error) {
    showMessage(
      `${error.message} Check your connection and try again.`,
      true
    );
  } finally {
    gallery.setAttribute('aria-busy', 'false');
    getImagesButton.disabled = false;
  }
}

getImagesButton.addEventListener('click', () => loadImages(1));
previousPageButton.addEventListener('click', () => loadImages(currentPage - 1));
nextPageButton.addEventListener('click', () => loadImages(currentPage + 1));
closeModalButton.addEventListener('click', () => imageModal.close());
imageModal.addEventListener('click', (event) => {
  if (event.target === imageModal) {
    imageModal.close();
  }
});

// Load the default date range as soon as the page opens.
loadImages();
