document.querySelectorAll('[data-video-player]').forEach((cover) => {
  const button = cover.querySelector('.video-play');
  button.addEventListener('click', () => {
    const videoId = cover.dataset.videoId;
    const title = cover.dataset.videoTitle;
    const player = document.createElement('iframe');
    player.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1`;
    player.title = title;
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.loading = 'lazy';
    cover.replaceChildren(player);
    cover.classList.add('is-playing');
  });
});
