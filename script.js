// ==UserScript==
// @name         HiAnime Auto Fullscreen
// @namespace    https://github.com/HaroldPetersInskipp/
// @version      1.0.1
// @homepageURL  https://github.com/HaroldPetersInskipp/HiAnime-Auto-Fullscreen
// @supportURL   https://github.com/HaroldPetersInskipp/HiAnime-Auto-Fullscreen/issues
// @downloadURL  https://gist.github.com/HaroldPetersInskipp/24ce2a7e8d9a6969c342656a23b6b892/raw/HiAnime-auto-fullscreen.user.js
// @updateURL    https://gist.github.com/HaroldPetersInskipp/24ce2a7e8d9a6969c342656a23b6b892/raw/HiAnime-auto-fullscreen.user.js
// @description  Auto Fullscreen + Manual Override Button
// @author       Inskipp
// @copyright    2025+, HaroldPetersInskipp
// @license      MIT; https://github.com/HaroldPetersInskipp/License-Files/blob/main/Don't%20Blame%20Us/LICENSE
// @match        https://megacloud.*
// @match        https://hianime.to/*
// @grant        none
// @icon         https://raw.githubusercontent.com/HaroldPetersInskipp/HiAnime-Auto-Fullscreen/main/icon.png
// ==/UserScript==

(function () {
  'use strict';

  /**************************************************************
   * VARIABLES
   **************************************************************/
  let lastEpisode = null; // Tracks the last episode URL to avoid redundant setup
  let gestureBoundForEpisode = false; // Flag to ensure the fullscreen request only happens once per episode
  let wrapper = null; // The wrapper element that will contain the iframe
  let toggleBtn = null; // The in-wrapper toggle button
  let originalParent = null; // Original parent of the iframe before moving into wrapper
  let originalNextSibling = null; // Original next sibling of the iframe
  let lastUrl = location.href; // Tracks URL changes for AJAX episode navigation
  const HIDE_DELAY = 2500; // Milliseconds before the toggle button auto-hides

  /**************************************************************
   * FLOATING FULLSCREEN BUTTON (always visible)
   **************************************************************/
  const fsToggleBtn = document.createElement("button");
  fsToggleBtn.style.position = "fixed";
  fsToggleBtn.style.top = "10px";
  fsToggleBtn.style.right = "10px";
  fsToggleBtn.style.zIndex = "999999";
  fsToggleBtn.style.padding = "8px 12px";
  fsToggleBtn.style.fontSize = "14px";
  fsToggleBtn.style.borderRadius = "6px";
  fsToggleBtn.style.border = "none";
  fsToggleBtn.style.background = "rgba(0,0,0,0.6)";
  fsToggleBtn.style.color = "#fff";
  fsToggleBtn.style.cursor = "pointer";
  fsToggleBtn.style.transition = "opacity 0.3s";
  fsToggleBtn.textContent = "⤡ Enter Fullscreen"; // Initial text
  document.body.appendChild(fsToggleBtn);

  // Auto-hide logic for floating button
  let hideTimeout;
  function showButton() {
      fsToggleBtn.style.opacity = "1";
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => { fsToggleBtn.style.opacity = "0"; }, HIDE_DELAY);
  }
  document.addEventListener("mousemove", showButton); // Show on any mouse movement
  showButton(); // Initial call to start hide timer

  // Clicking floating button toggles fullscreen on the wrapper
  fsToggleBtn.addEventListener("click", () => {
      const wrapper = document.querySelector("#gm-fullscreen-wrapper");
      if (!wrapper) return;
      if (document.fullscreenElement === wrapper) {
          document.exitFullscreen(); // Exit fullscreen if already fullscreen
      } else {
          wrapper.requestFullscreen?.(); // Enter fullscreen
      }
  });

  // Update button text dynamically based on fullscreen state
  document.addEventListener("fullscreenchange", () => {
      const wrapper = document.querySelector("#gm-fullscreen-wrapper");
      if (!wrapper) return;
      fsToggleBtn.textContent = document.fullscreenElement === wrapper ? "⤢ Exit Fullscreen" : "⤡ Enter Fullscreen";
  });

  /**************************************************************
   * WRAPPER CREATION
   **************************************************************/
  function createWrapper() {
      if (wrapper) return wrapper;
      wrapper = document.createElement('div');
      wrapper.id = 'gm-fullscreen-wrapper';
      Object.assign(wrapper.style, {
          display: 'block',
          position: 'relative',
          width: '100%',
          height: 'auto', // Not fullscreen by default
          maxWidth: '100%',
          background: '#000',
          zIndex: '99998',
          boxSizing: 'border-box',
          overflow: 'hidden'
      });
      return wrapper;
  }

  /**************************************************************
   * IFRAME STYLING
   **************************************************************/
  function styleIframeForWrapper(ifr) {
      if (!ifr) return;
      // Make iframe fill the wrapper and remove default margins/borders
      Object.assign(ifr.style, {
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block',
          margin: '0',
          padding: '0',
          boxSizing: 'border-box'
      });
      try { ifr.setAttribute('allowfullscreen', ''); } catch (e) {}
  }

  /**************************************************************
   * MOVE IFRAME INTO WRAPPER
   **************************************************************/
  function moveIframeIntoWrapper(iframe) {
      if (!iframe) return;
      const wrap = createWrapper();

      // Save original parent and sibling to restore if needed
      if (!originalParent) {
          originalParent = iframe.parentNode;
          originalNextSibling = iframe.nextSibling;
      }

      // Append wrapper to DOM if not already
      if (!wrap.parentNode) {
          if (originalParent) originalParent.insertBefore(wrap, originalNextSibling);
          else document.body.appendChild(wrap);
      }

      // Move iframe into wrapper
      if (iframe.parentNode !== wrap) wrap.appendChild(iframe);
      styleIframeForWrapper(iframe);

      // Setup the in-wrapper toggle button and auto-hide behavior
      createToggleButton();
      setupToggleButtonAutoHide();
  }

  /**************************************************************
   * IN-WRAPPER TOGGLE BUTTON
   **************************************************************/
  function createToggleButton() {
      if (toggleBtn) return toggleBtn;
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'gm-fs-toggle-btn';
      Object.assign(toggleBtn.style, {
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: '99999',
          padding: '8px 12px',
          fontSize: '14px',
          borderRadius: '6px',
          border: 'none',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'opacity 0.3s',
          opacity: '1'
      });

      // Clicking the in-wrapper button toggles fullscreen
      toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (document.fullscreenElement === wrapper) {
              document.exitFullscreen();
          } else {
              requestFullscreenOnWrapper();
          }
      });

      updateToggleButtonText(); // Set initial text
      wrapper.appendChild(toggleBtn);

      // Update button text dynamically
      document.addEventListener('fullscreenchange', updateToggleButtonText);

      return toggleBtn;
  }

  function updateToggleButtonText() {
      if (!toggleBtn) return;
      toggleBtn.textContent = (document.fullscreenElement === wrapper) ? '⤢ Exit Fullscreen' : '⤡ Enter Fullscreen';
  }

  /**************************************************************
   * IN-WRAPPER BUTTON AUTO-HIDE
   **************************************************************/
  function setupToggleButtonAutoHide() {
      if (!toggleBtn || !wrapper) return;

      let wrapperHideTimeout;

      function showButton() {
          toggleBtn.style.opacity = '0.3';
          resetHideTimer();
      }

      function hideButton() {
          toggleBtn.style.opacity = '0';
      }

      function resetHideTimer() {
          if (wrapperHideTimeout) clearTimeout(wrapperHideTimeout);
          wrapperHideTimeout = setTimeout(hideButton, HIDE_DELAY);
      }

      // Only track mouse movements inside the wrapper
      wrapper.addEventListener('mousemove', showButton);
      wrapper.addEventListener('mouseleave', hideButton);

      // Initial hide timer
      resetHideTimer();
  }

  /**************************************************************
   * WAIT FOR IFRAME TO EXIST (handles AJAX-loaded episodes)
   **************************************************************/
  function waitForIframeOnce(cb) {
      const iframe = document.querySelector('#iframe-embed');
      if (iframe) return cb(iframe);
      const obs = new MutationObserver(() => {
          const f = document.querySelector('#iframe-embed');
          if (f) {
              obs.disconnect();
              cb(f);
          }
      });
      obs.observe(document.body, { childList: true, subtree: true });
  }

  /**************************************************************
   * FULLSCREEN REQUEST ON WRAPPER
   **************************************************************/
  function requestFullscreenOnWrapper() {
      if (!wrapper) return;
      if (wrapper.requestFullscreen) wrapper.requestFullscreen();
      else if (wrapper.mozRequestFullScreen) wrapper.mozRequestFullScreen();
      else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
      else if (wrapper.msRequestFullscreen) wrapper.msRequestFullscreen();
  }

  /**************************************************************
   * EPISODE SETUP
   * Ensures auto-fullscreen runs once per episode
   **************************************************************/
  function setupForEpisode() {
      const currentEpisode = window.location.pathname + window.location.search;
      if (currentEpisode === lastEpisode) return; // Already setup
      lastEpisode = currentEpisode;
      gestureBoundForEpisode = false;

      waitForIframeOnce((iframe) => {
          moveIframeIntoWrapper(iframe);

          // First user interaction required for some browsers to allow fullscreen
          const gestureHandler = function () {
              if (gestureBoundForEpisode) return;
              gestureBoundForEpisode = true;
              requestFullscreenOnWrapper();
              document.removeEventListener('click', gestureHandler, true);
              document.removeEventListener('keydown', gestureHandler, true);
          };
          document.addEventListener('click', gestureHandler, true);
          document.addEventListener('keydown', gestureHandler, true);
      });
  }

  /**************************************************************
   * OBSERVERS
   * 1) Detect iframe replacement by AJAX (next episode)
   * 2) Detect URL changes to setup per episode
   **************************************************************/
  function observeIframeChanges() {
      const bodyObs = new MutationObserver(() => {
          const iframe = document.querySelector('#iframe-embed');
          if (!iframe) return;
          if (!wrapper || iframe.parentNode !== wrapper) moveIframeIntoWrapper(iframe);
      });
      bodyObs.observe(document.body, { childList: true, subtree: true });
  }

  function observeUrlChanges() {
      const urlObs = new MutationObserver(() => {
          if (location.href !== lastUrl) {
              lastUrl = location.href;
              setupForEpisode();
          }
      });
      urlObs.observe(document.body, { childList: true, subtree: true });
  }

  /**************************************************************
   * INITIALIZATION
   **************************************************************/
  document.addEventListener('fullscreenchange', () => {
      updateToggleButtonText(); // Ensure wrapper toggle button text is updated
  });

  (function init() {
      setupForEpisode(); // Setup fullscreen and wrapper for first episode
      observeIframeChanges(); // Detect iframe replacements
      observeUrlChanges(); // Detect AJAX episode navigation
  })();

})();
