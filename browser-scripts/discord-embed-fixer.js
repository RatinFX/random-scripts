// ==UserScript==
// @name         discord embed fixer
// @description  Automatically replaces copied website page urls with a randomly choosen embedder link for Discord
// @version      1.0.0
// @author       RatinFX (https://github.com/RatinFX)
// @namespace    https://github.com/RatinFX/random-scripts
// @supportURL   https://github.com/RatinFX/random-scripts
// @match        *://twitter.com/*
// @match        *://*.x.com/*
// @match        *://*.reddit.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.instagram.com/*
// @match        *://*.facebook.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function() {
  'use strict';

  /** Select a random link from the list */
  function getRandomDomain(protocol, path, embedders) {
    const domain = embedders[Math.floor(Math.random() * embedders.length)];
    console.log("[URL copy script] - domain:", domain);
    const url = `${protocol}${domain}${path || ''}`;
    return url;
  }

  /** Create a static regex parser for the given site */
  function createRegex(link) {
    const regex = new RegExp(`(https?:\\/\\/(?:www\\.)?)(?:${link})\\.com(\\/.*)?`, 'i');
    console.log("[URL copy script] - createRegex | regex:", regex);
    return regex;
  }

  /** Website configs */
  const siteRules = [
    {
      name: "twitter",
      regex: createRegex("x|twitter"),
      embedders: [
        'fixupx.com',
        'girlcockx.com',
        'fxtwitter.com',
        'cunnyx.com',
        'stupidpenisx.com',
      ],
      transform(match, protocol, path) {
        return getRandomDomain(protocol, path, this.embedders);
      },
    },
    {
      name: "reddit",
      regex: createRegex("reddit"),
      embedders: [
        'rxddit.com',
      ],
      transform(match, protocol, path) {
        return getRandomDomain(protocol, path, this.embedders);
      },
    },
    {
      name: "bilibili",
      regex: createRegex("bilibili"),
      embedders: [
        'vxbilibili.com',
      ],
      transform(match, protocol, path) {
        return getRandomDomain(protocol, path, this.embedders);
      },
      allowedParams: ['t'], // [ timestamp ]
    },
    {
      name: "instagram",
      regex: createRegex("instagram"),
      embedders: [
        'kkinstagram.com',
      ],
      transform(match, protocol, path) {
        return getRandomDomain(protocol, path, this.embedders);
      },
    },
    {
      name: "facebook",
      regex: createRegex("facebook"),
      embedders: [
        'facebed.com',
      ],
      transform(match, protocol, path) {
        return getRandomDomain(protocol, path, this.embedders);
      },
      allowedParams: ['fbid'], // [ photo id ]
    }
  ];

  /**
   * Remove tracking data from the link, e.g.:
   * - X/Twitter: ?s=20;
   * - Reddit: ?utm_source=share &utm_medium=web3x &utm_name=web3xcss &utm_term=1 &utm_content=share_button;
   * - Bilibili: ?share_source=copy_web &t=60 | ?spm_id_from=000.1111.tianma.1-1-1.click | ?spm_id_from=000.111.search-card.all.click;
   * - Instagram: ?utm_source=ig_web_copy_link &igsh=abcdefghijklmnopqrst
   * - Facebook: ?fbid=012345678910111213 &set=pcb.01234567891011121
   */
  function stripTracking(urlString, rule) {
    try {
      const url = new URL(urlString);
      const params = url.searchParams;
      const allowed = rule?.allowedParams ? new Set(rule.allowedParams) : null;

      for (const [key] of [...params.entries()]) {
        if (!allowed || !allowed.has(key)) {
          params.delete(key);
        }
      }

      const query = params.toString();

      return (
        url.origin +
        url.pathname +
        (query ? '?' + query : '') +
        url.hash
      );
    } catch (ex) {
      console.error("[URL copy script] - error:", ex);
      return urlString;
    }
  }

  /** Process the links based on the given rule */
  function processLink(text) {
    console.log("[URL copy script] - processing URL", text);
    let modified = text;
    let appliedRule = null;

    for (const rule of siteRules) {
      if (rule.regex.test(modified)) {
        appliedRule = rule;
        modified = modified.replace(
          rule.regex,
          rule.transform.bind(rule)
        );

        break;
      }
    }

    if (appliedRule) {
      modified = stripTracking(modified, appliedRule);
      console.log("[URL copy script] - modified URL", modified);
      return modified;
    }

    return null;
  }

  /**
   * Overwrite clipboard section
   */

  const originalWriteText = navigator.clipboard?.writeText?.bind(navigator.clipboard);

  /** Zen Browser "Copy URL" Shortcut (Ctrl+Shift+C) */
  document.addEventListener('keydown', (e) => {
    const isCopyShortcut =
      (e.ctrlKey || e.metaKey)
      && e.shiftKey
      && e.code === 'KeyC';

    if (isCopyShortcut) {
      console.log("[URL copy script] - keydown > Ctrl + Shift + C");
      const newURL = processLink(window.location.href);

      if (newURL) {
        originalWriteText(newURL);
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
  });

  /** Standard Text Selection Copy */
  document.addEventListener('copy', (event) => {
    const selection = document.getSelection()?.toString();
    const newURL = processLink(selection);

    if (newURL) {
      console.log("[URL copy script] - copy");
      event.clipboardData?.setData('text/plain', newURL);
      event.preventDefault();
    }
  });

  /** Intercept programmatic clipboard writes (like Reddit Share → Copy Link) */
  if (navigator.clipboard && navigator.clipboard.writeText) {
    console.log("[URL copy script] - clipboard writeText")

    navigator.clipboard.writeText = async function(text) {
      const newURL = processLink(text);
      return originalWriteText(newURL || text);
    };
  }
})();
