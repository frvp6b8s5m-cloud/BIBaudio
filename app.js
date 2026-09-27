/* PART 1: DATABASE / ACCOUNTS / STORAGE */

"use strict";

const DB_NAME = "BpluginsDB";
const DB_VERSION = 1;

const USER_KEY = "bplugins_user";

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const uid = (prefix) =>
  `${prefix}_${crypto.randomUUID()}`;


function openDB() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(DB_NAME, DB_VERSION);


    request.onupgradeneeded = () => {

      const db = request.result;


      if (!db.objectStoreNames.contains("users")) {

        const users =
          db.createObjectStore(
            "users",
            { keyPath: "id" }
          );

        users.createIndex(
          "username",
          "username",
          { unique: true }
        );

        users.createIndex(
          "email",
          "email",
          { unique: true }
        );
      }


      if (!db.objectStoreNames.contains("plugins")) {

        const plugins =
          db.createObjectStore(
            "plugins",
            { keyPath: "id" }
          );

        plugins.createIndex(
          "ownerId",
          "ownerId"
        );
      }


      if (!db.objectStoreNames.contains("votes")) {

        db.createObjectStore(
          "votes",
          { keyPath: "id" }
        );
      }


      if (!db.objectStoreNames.contains("comments")) {

        db.createObjectStore(
          "comments",
          { keyPath: "id" }
        );
      }


      if (!db.objectStoreNames.contains("trades")) {

        db.createObjectStore(
          "trades",
          { keyPath: "id" }
        );
      }

    };


    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(request.error);

  });

}


async function db(store, mode, operation) {

  const database =
    await openDB();

  return new Promise(
    (resolve, reject) => {

      const transaction =
        database.transaction(
          store,
          mode
        );

      const objectStore =
        transaction.objectStore(store);

      const request =
        operation(objectStore);

      request.onsuccess =
        () => resolve(request.result);

      request.onerror =
        () => reject(request.error);

    }
  );

}


const getAll =
  store =>
    db(
      store,
      "readonly",
      s => s.getAll()
    );


const getOne =
  (store, id) =>
    db(
      store,
      "readonly",
      s => s.get(id)
    );


const put =
  (store, value) =>
    db(
      store,
      "readwrite",
      s => s.put(value)
    );


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


async function hash(value) {

  const bytes =
    new TextEncoder().encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return [...new Uint8Array(digest)]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


function currentUserId() {

  return sessionStorage.getItem(
    USER_KEY
  );

}


async function currentUser() {

  const id =
    currentUserId();

  if (!id) return null;

  return getOne(
    "users",
    id
  );

}


async function createAccount(
  username,
  email,
  password
) {

  username =
    String(username)
      .trim();

  email =
    String(email)
      .trim()
      .toLowerCase();


  if (
    !/^[a-zA-Z0-9_]{3,24}$/
      .test(username)
  ) {

    throw new Error(
      "Artist ID must contain 3-24 letters, numbers or underscores."
    );

  }


  if (
    !email.includes("@")
  ) {

    throw new Error(
      "Enter a valid email."
    );

  }


  if (
    password.length < 8
  ) {

    throw new Error(
      "Password must contain at least 8 characters."
    );

  }


  const users =
    await getAll("users");


  if (
    users.some(
      user =>
        user.username.toLowerCase() ===
        username.toLowerCase()
    )
  ) {

    throw new Error(
      "That Artist ID already exists."
    );

  }


  if (
    users.some(
      user =>
        user.email === email
    )
  ) {

    throw new Error(
      "That email already exists."
    );

  }


  const user = {

    id: uid("user"),

    username,

    email,

    passwordHash:
      await hash(password),

    createdAt:
      new Date().toISOString()

  };


  await put(
    "users",
    user
  );


  sessionStorage.setItem(
    USER_KEY,
    user.id
  );


  return user;

}


async function login(
  username,
  password
) {

  const users =
    await getAll("users");


  const user =
    users.find(
      item =>
        item.username.toLowerCase() ===
        String(username)
          .trim()
          .toLowerCase()
    );


  if (!user) {

    throw new Error(
      "Artist ID or password is incorrect."
    );

  }


  const passwordHash =
    await hash(password);


  if (
    passwordHash !==
    user.passwordHash
  ) {

    throw new Error(
      "Artist ID or password is incorrect."
    );

  }


  sessionStorage.setItem(
    USER_KEY,
    user.id
  );


  return user;

}


function logout() {

  sessionStorage.removeItem(
    USER_KEY
  );

  location.href =
    "./index.html";

}


/* PART 2: PLUGIN MARKET / VOTES / COMMENTS / TRADES */

const DEMO_PLUGINS = [

  {
    id: "demo_grain",
    ownerId: "demo",
    ownerName: "BZaudio",
    name: "Grain Relay",
    description:
      "Granular delay textures for fractured movement and unstable tails.",
    baseValue: 40,
    likes: 87,
    demo: true
  },

  {
    id: "demo_northline",
    ownerId: "demo",
    ownerName: "Northline",
    name: "Northline",
    description:
      "A compact mono synth with hard edges, sub weight and cinematic drift.",
    baseValue: 65,
    likes: 126,
    demo: true
  },

  {
    id: "demo_phase",
    ownerId: "demo",
    ownerName: "IZ_Studios",
    name: "Phase Cartographer",
    description:
      "A visual utility for tracing stereo phase relationships.",
    baseValue: 25,
    likes: 42,
    demo: true
  }

];


function pluginValue(plugin) {

  return (
    Number(plugin.baseValue || 1) +
    Number(plugin.likes || 0) * 5
  );

}


function tier(likes) {

  if (likes >= 100)
    return "Elite";

  if (likes >= 50)
    return "Artisan";

  return "Exhibition";

}


async function allPlugins() {

  const stored =
    await getAll("plugins");

  return [
    ...DEMO_PLUGINS,
    ...stored
  ];

}


async function hasVoted(
  pluginId,
  userId
) {

  if (!userId)
    return false;


  const votes =
    await getAll("votes");


  return votes.some(
    vote =>
      vote.pluginId === pluginId &&
      vote.userId === userId
  );

}


async function applaud(
  pluginId
) {

  const user =
    await currentUser();


  if (!user) {

    throw new Error(
      "Create an account or log in before applauding."
    );

  }


  const plugins =
    await getAll("plugins");


  const plugin =
    plugins.find(
      item =>
        item.id === pluginId
    );


  if (!plugin) {

    throw new Error(
      "This demo plugin cannot be modified."
    );

  }


  if (
    await hasVoted(
      pluginId,
      user.id
    )
  ) {

    throw new Error(
      "You have already applauded this plugin."
    );

  }


  await put(
    "votes",
    {
      id:
        `${pluginId}_${user.id}`,

      pluginId,

      userId:
        user.id,

      createdAt:
        new Date().toISOString()
    }
  );


  plugin.likes =
    Number(plugin.likes || 0) + 1;


  await put(
    "plugins",
    plugin
  );

}


async function addComment(
  pluginId,
  text
) {

  const user =
    await currentUser();


  if (!user) {

    throw new Error(
      "Log in to comment."
    );

  }


  text =
    String(text).trim();


  if (
    !text ||
    text.length > 1000
  ) {

    throw new Error(
      "Comment must contain 1-1000 characters."
    );

  }


  await put(
    "comments",
    {

      id:
        uid("comment"),

      pluginId,

      userId:
        user.id,

      text,

      createdAt:
        new Date().toISOString()

    }
  );

}


async function getComments(
  pluginId
) {

  const comments =
    await getAll("comments");


  const matching =
    comments
      .filter(
        item =>
          item.pluginId ===
          pluginId
      )
      .sort(
        (a, b) =>
          b.createdAt
            .localeCompare(
              a.createdAt
            )
      );


  return Promise.all(
    matching.map(
      async comment => {

        const user =
          await getOne(
            "users",
            comment.userId
          );


        return {
          ...comment,

          username:
            user?.username ||
            "Unknown Artist"
        };

      }
    )
  );

}


async function createTrade(
  targetPluginId,
  offeredPluginId
) {

  const user =
    await currentUser();


  if (!user)
    throw new Error(
      "Log in before trading."
    );


  const plugins =
    await getAll("plugins");


  const target =
    plugins.find(
      p =>
        p.id === targetPluginId
    );


  const offered =
    plugins.find(
      p =>
        p.id === offeredPluginId
    );


  if (
    !target ||
    !offered
  ) {

    throw new Error(
      "Both plugins must be uploaded account-owned plugins."
    );

  }


  if (
    offered.ownerId !==
    user.id
  ) {

    throw new Error(
      "You can only offer your own plugin."
    );

  }


  if (
    target.ownerId ===
    user.id
  ) {

    throw new Error(
      "You cannot trade with yourself."
    );

  }


  await put(
    "trades",
    {

      id:
        uid("trade"),

      fromUserId:
        user.id,

      toUserId:
        target.ownerId,

      targetPluginId,

      offeredPluginId,

      status:
        "pending",

      createdAt:
        new Date().toISOString()

    }
  );

}


async function updateTrade(
  tradeId,
  status
) {

  const user =
    await currentUser();


  const trade =
    await getOne(
      "trades",
      tradeId
    );


  if (
    !trade ||
    !user ||
    trade.toUserId !==
      user.id
  ) {

    throw new Error(
      "Trade authorization failed."
    );

  }


  trade.status =
    status;


  trade.updatedAt =
    new Date().toISOString();


  await put(
    "trades",
    trade
  );

}


async function renderPlugins() {

  const grid =
    $("#plugin-grid");


  if (!grid)
    return;


  const plugins =
    await allPlugins();


  plugins.sort(
    (a, b) =>
      pluginValue(b) -
      pluginValue(a)
  );


  grid.innerHTML =
    plugins.map(
      plugin => {

        const level =
          tier(plugin.likes);


        return `

          <article
            class="plugin-card glass-panel tier-${level.toLowerCase()}"
            data-plugin-id="${escapeHTML(plugin.id)}"
          >

            <div class="plugin-cover">

              ${
                plugin.imageBlob

                ? `<img
                    src="${URL.createObjectURL(plugin.imageBlob)}"
                    alt="${escapeHTML(plugin.name)} cover"
                  >`

                : `<span>
                    BZAUDIO // PLUGIN
                  </span>`
              }

            </div>


            <div class="card-meta">

              <span>
                ${escapeHTML(
                  plugin.ownerName ||
                  "INDEPENDENT ARTIST"
                )}
              </span>

              <span class="tier-badge">
                ${level.toUpperCase()}
              </span>

            </div>


            <h3>
              ${escapeHTML(
                plugin.name
              )}
            </h3>


            <p>
              ${escapeHTML(
                plugin.description
              )}
            </p>


            <div class="score-row">

              <strong>
                ${plugin.likes}
              </strong>

              <span>
                APPLAUSE
              </span>

              <strong>
                $${pluginValue(plugin)}
              </strong>

            </div>


            <div class="card-actions">

              <button
                class="applaud-button"
                data-action="vote"
                type="button"
              >
                [APPLAUD]
              </button>

              <button
                class="text-button"
                data-action="open"
                type="button"
              >
                [OPEN]
              </button>

            </div>

          </article>

        `;

      }
    ).join("");

}


async function openPlugin(
  pluginId
) {

  const plugins =
    await allPlugins();


  const plugin =
    plugins.find(
      item =>
        item.id === pluginId
    );


  if (!plugin)
    return;


  const comments =
    await getComments(
      pluginId
    );


  const dialog =
    $("#plugin-dialog");


  const detail =
    $("#plugin-detail");


  const image =
    plugin.imageBlob
      ? URL.createObjectURL(
          plugin.imageBlob
        )
      : "";


  const audio =
    plugin.audioBlob
      ? URL.createObjectURL(
          plugin.audioBlob
        )
      : "";


  detail.innerHTML = `

    <div class="detail-grid">

      <div>

        <div class="detail-cover">

          ${
            image
              ? `<img
                  src="${image}"
                  alt="${escapeHTML(plugin.name)}"
                >`
              : "NO COVER"
          }

        </div>

        ${
          audio
            ? `<audio
                class="sample-player"
                controls
                src="${audio}"
              ></audio>`
            : ""
        }

      </div>


      <div>

        <p class="eyebrow">
          ${escapeHTML(
            plugin.ownerName ||
            "INDEPENDENT ARTIST"
          )}
        </p>

        <h2>
          ${escapeHTML(
            plugin.name
          )}
        </h2>

        <p>
          ${escapeHTML(
            plugin.description
          )}
        </p>


        <div class="value-display">

          <span>
            EXCHANGE VALUE
          </span>

          <strong>
            $${pluginValue(plugin)}
          </strong>

        </div>


        <button
          class="primary-command"
          data-detail-vote="${plugin.id}"
          type="button"
        >
          [APPLAUD]
        </button>


        ${
          plugin.pluginBlob
            ? `
              <button
                class="text-button"
                data-download-plugin="${plugin.id}"
                type="button"
              >
                [DOWNLOAD_PLUGIN]
              </button>
            `
            : ""
        }


        <div class="trade-box">

          <p class="eyebrow">
            OFFER A TRADE
          </p>

          <select id="trade-offer-select">

            <option value="">
              SELECT YOUR PLUGIN
            </option>

          </select>

          <button
            class="text-button"
            data-create-trade="${plugin.id}"
            type="button"
          >
            [SEND_TRADE]
          </button>

        </div>

      </div>

    </div>


    <section class="comments-section">

      <h3>
        COMMIT LOG
      </h3>


      <div>

        ${
          comments.length

            ? comments.map(
                comment => `

                  <article class="comment">

                    <strong>
                      ${escapeHTML(
                        comment.username
                      )}
                    </strong>

                    <time>
                      ${new Date(
                        comment.createdAt
                      ).toLocaleString()}
                    </time>

                    <p>
                      ${escapeHTML(
                        comment.text
                      )}
                    </p>

                  </article>

                `
              ).join("")

            : `<p class="muted">
                [NO_COMMIT_MESSAGES]
              </p>`
        }

      </div>


      <form id="comment-form">

        <textarea
          name="comment"
          rows="4"
          maxlength="1000"
          required
          placeholder="Leave feedback..."
        ></textarea>

        <button
          class="primary-command"
          type="submit"
        >
          [COMMIT_COMMENT]
        </button>

      </form>

    </section>

  `;


  const user =
    await currentUser();


  if (user) {

    const mine =
      (await getAll("plugins"))
        .filter(
          p =>
            p.ownerId ===
            user.id
        );


    const select =
      $("#trade-offer-select");


    mine.forEach(
      plugin => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          plugin.id;

        option.textContent =
          plugin.name;

        select.appendChild(
          option
        );

      }
    );

  }


  dialog.showModal();

}


async function uploadPlugin(
  form
) {

  const user =
    await currentUser();


  if (!user)
    throw new Error(
      "Log in first."
    );


  const data =
    new FormData(form);


  const packageFile =
    data.get("pluginFile");


  const image =
    data.get("image");


  const audio =
    data.get("audio");


  if (
    !(packageFile instanceof File) ||
    !packageFile.size
  ) {

    throw new Error(
      "Choose a plugin package."
    );

  }


  if (
    !(image instanceof File) ||
    !image.type.startsWith("image/")
  ) {

    throw new Error(
      "Choose a cover image."
    );

  }


  if (
    !(audio instanceof File) ||
    !audio.type.startsWith("audio/")
  ) {

    throw new Error(
      "Choose an audio sample."
    );

  }


  if (
    packageFile.size >
    15 * 1024 * 1024
  ) {

    throw new Error(
      "Plugin package is limited to 15 MB in this static build."
    );

  }


  const plugin = {

    id:
      uid("plugin"),

    ownerId:
      user.id,

    ownerName:
      user.username,

    name:
      String(
        data.get("name")
      ).trim(),

    description:
      String(
        data.get("description")
      ).trim(),

    baseValue:
      Number(
        data.get("baseValue")
      ) || 1,

    likes:
      0,

    fileName:
      packageFile.name,

    pluginBlob:
      packageFile,

    imageBlob:
      image,

    audioBlob:
      audio,

    createdAt:
      new Date().toISOString()

  };


  if (
    !plugin.name ||
    !plugin.description
  ) {

    throw new Error(
      "Name and description are required."
    );

  }


  await put(
    "plugins",
    plugin
  );

}


/* PART 3: NAVIGATION / AUDIO / UI */

function initNavigation() {

  const views =
    $$(".view");

  const links =
    $$(".main-nav a");


  function showView(id) {

    const target =
      document.getElementById(id) ||
      document.getElementById("home");


    views.forEach(
      view => {

        const active =
          view === target;

        view.classList.toggle(
          "visible",
          active
        );

        view.classList.toggle(
          "hidden",
          !active
        );

      }
    );


    links.forEach(
      link => {

        link.setAttribute(
          "aria-current",
          link.dataset.view ===
          target.id
            ? "page"
            : "false"
        );

      }
    );

  }


  links.forEach(
    link => {

      link.addEventListener(
        "click",
        event => {

          event.preventDefault();

          showView(
            link.dataset.view
          );

          history.replaceState(
            null,
            "",
            `#${link.dataset.view}`
          );

        }
      );

    }
  );


  showView(
    location.hash.slice(1) ||
    "home"
  );


  window.addEventListener(
    "hashchange",
    () =>
      showView(
        location.hash.slice(1) ||
        "home"
      )
  );

}


function initAudio() {

  const button =
    $("#audition-button");


  if (!button)
    return;


  let context;
  let oscillator;
  let filter;
  let gain;


  button.addEventListener(
    "click",
    async () => {

      const status =
        $("#audio-status");


      if (oscillator) {

        oscillator.stop();

        oscillator.disconnect();

        filter.disconnect();

        gain.disconnect();

        oscillator =
          null;

        button.textContent =
          "[AUDITION_CANVAS_SIGNATURE]";

        status.textContent =
          "[AUDIO // STANDBY]";

        document.body
          .classList
          .remove(
            "audio-live"
          );

        return;

      }


      context ||=
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();


      if (
        context.state ===
        "suspended"
      ) {

        await context.resume();

      }


      oscillator =
        context.createOscillator();

      filter =
        context.createBiquadFilter();

      gain =
        context.createGain();


      oscillator.type =
        "sawtooth";

      oscillator.frequency.value =
        55;


      filter.type =
        "lowpass";

      filter.frequency.value =
        140;


      gain.gain.value =
        0.035;


      oscillator
        .connect(filter);

      filter
        .connect(gain);

      gain
        .connect(
          context.destination
        );


      oscillator.start();


      button.textContent =
        "[STOP_CANVAS_SIGNATURE]";

      status.textContent =
        "[AUDIO // 55HZ_SAW // 140HZ_LP // ACTIVE]";


      document.body
        .classList
        .add(
          "audio-live"
        );

    }
  );

}


function initAuth() {

  const form =
    $("#auth-form");


  if (!form)
    return;


  let mode =
    "login";


  $$(".auth-tab")
    .forEach(
      tab => {

        tab.addEventListener(
          "click",
          () => {

            mode =
              tab.dataset.authMode;


            $$(".auth-tab")
              .forEach(
                item =>
                  item.classList.toggle(
                    "active",
                    item === tab
                  )
              );


            $("#email-field")
              .classList
              .toggle(
                "hidden",
                mode !== "create"
              );


            $("#auth-submit")
              .textContent =
              mode === "create"
                ? "[CREATE_ARTIST_ACCOUNT]"
                : "[INITIALIZE_ENGINE]";

          }
        );

      }
    );


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const data =
        new FormData(form);


      const status =
        $("#auth-status");


      try {

        status.textContent =
          "[IDENTITY // PROCESSING]";


        if (
          mode === "create"
        ) {

          await createAccount(
            data.get("username"),
            data.get("email"),
            data.get("password")
          );

        } else {

          await login(
            data.get("username"),
            data.get("password")
          );

        }


        status.textContent =
          "[ACCESS_GRANTED // ARTIST_SESSION_ACTIVE]";


        await updateHeader();


        setTimeout(
          () =>
            location.href =
              "./dashboard.html",
          400
        );

      } catch (error) {

        status.textContent =
          `[ACCESS_DENIED // ${error.message}]`;

      }

    }
  );

}


async function updateHeader() {

  const user =
    await currentUser();


  $("#account-button")
    ?.classList
    .toggle(
      "hidden",
      !!user
    );


  $("#logout-button")
    ?.classList
    .toggle(
      "hidden",
      !user
    );

}


function initShop() {

  $("#plugin-grid")
    ?.addEventListener(
      "click",
      async event => {

        const card =
          event.target.closest(
            "[data-plugin-id]"
          );


        if (!card)
          return;


        const id =
          card.dataset.pluginId;


        try {

          if (
            event.target.closest(
              '[data-action="vote"]'
            )
          ) {

            await applaud(id);

            await renderPlugins();

          }


          if (
            event.target.closest(
              '[data-action="open"]'
            )
          ) {

            await openPlugin(id);

          }

        } catch (error) {

          alert(
            error.message
          );

        }

      }
    );

}


function initPluginDialog() {

  $("#plugin-dialog")
    ?.addEventListener(
      "click",
      async event => {

        const vote =
          event.target.closest(
            "[data-detail-vote]"
          );


        if (vote) {

          try {

            await applaud(
              vote.dataset.detailVote
            );

            await renderPlugins();

            await openPlugin(
              vote.dataset.detailVote
            );

          } catch (error) {

            alert(
              error.message
            );

          }

        }


        const commentForm =
          event.target.closest(
            "#comment-form"
          );


        if (
          commentForm &&
          event.target.tagName ===
            "BUTTON"
        ) {

          return;

        }

      }
    );


  $("#plugin-dialog")
    ?.addEventListener(
      "submit",
      async event => {

        if (
          event.target.id !==
          "comment-form"
        )
          return;


        event.preventDefault();


        const pluginId =
          $("#plugin-detail")
            .querySelector(
              "[data-detail-vote]"
            )
            .dataset
            .detailVote;


        const text =
          new FormData(
            event.target
          ).get("comment");


        try {

          await addComment(
            pluginId,
            text
          );


          await openPlugin(
            pluginId
          );

        } catch (error) {

          alert(
            error.message
          );

        }

      }
    );


  $("#plugin-dialog")
    ?.addEventListener(
      "click",
      event => {

        const download =
          event.target.closest(
            "[data-download-plugin]"
          );


        if (!download)
          return;


        getAll("plugins")
          .then(
            plugins => {

              const plugin =
                plugins.find(
                  p =>
                    p.id ===
                    download.dataset
                      .downloadPlugin
                );


              if (!plugin?.pluginBlob)
                return;


              const url =
                URL.createObjectURL(
                  plugin.pluginBlob
                );


              const link =
                document.createElement(
                  "a"
                );


              link.href =
                url;

              link.download =
                plugin.fileName ||
                "plugin.zip";

              link.click();


              setTimeout(
                () =>
                  URL.revokeObjectURL(
                    url
                  ),
                1000
              );

            }
          );

      }
    );


  $$("[data-close-dialog]")
    .forEach(
      button =>
        button.addEventListener(
          "click",
          () =>
            button
              .closest("dialog")
              .close()
        )
    );

}


function initBarter() {

  function addRow(
    listId,
    name,
    placeholder
  ) {

    const list =
      document.getElementById(
        listId
      );


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "input-row";


    row.innerHTML = `

      <input
        name="${name}[]"
        required
        placeholder="${placeholder}"
      >

      <button
        type="button"
        class="remove-input"
      >
        ×
      </button>

    `;


    list.appendChild(
      row
    );

  }


  $("#add-outgoing")
    ?.addEventListener(
      "click",
      () =>
        addRow(
          "outgoing-list",
          "outgoing",
          "Plugin / asset"
        )
    );


  $("#add-seeking")
    ?.addEventListener(
      "click",
      () =>
        addRow(
          "seeking-list",
          "seeking",
          "Wanted plugin"
        )
    );


  $("#barter-form")
    ?.addEventListener(
      "click",
      event => {

        if (
          !event.target
            .classList
            .contains(
              "remove-input"
            )
        )
          return;


        const row =
          event.target
            .closest(
              ".input-row"
            );


        const list =
          row.parentElement;


        if (
          list.children.length >
          1
        ) {

          row.remove();

        }

      }
    );


  $("#barter-form")
    ?.addEventListener(
      "submit",
      event => {

        event.preventDefault();


        const data =
          new FormData(
            event.currentTarget
          );


        const packageData = {

          type:
            "Bplugins barter",

          createdAt:
            new Date().toISOString(),

          outgoingAssets:
            data.getAll(
              "outgoing[]"
            ),

          seekingTargets:
            data.getAll(
              "seeking[]"
            ),

          note:
            data.get("note") || ""

        };


        const subject =
          encodeURIComponent(
            "Bplugins Barter Package"
          );


        const body =
          encodeURIComponent(
            JSON.stringify(
              packageData,
              null,
              2
            )
          );


        $("#barter-status")
          .textContent =
          "[TRANSMISSION // EMAIL_CLIENT_OPENING]";


        location.href =
          `mailto:?subject=${subject}&body=${body}`;

      }
    );

}


async function init() {

  initNavigation();

  initAudio();

  initAuth();

  initShop();

  initPluginDialog();

  initBarter();

  await updateHeader();

  await renderPlugins();

}


document.addEventListener(
  "DOMContentLoaded",
  init
);


/* SECRET BZA ADMIN ENTRY */

if (
  location.pathname.endsWith(
    "index.html"
  ) ||
  location.pathname.endsWith("/")
) {

  let buffer = "";


  window.addEventListener(
    "keydown",
    event => {

      if (
        event.key.length !== 1
      )
        return;


      buffer =
        (
          buffer +
          event.key.toLowerCase()
        ).slice(-3);


      if (
        buffer === "bza"
      ) {

        location.href =
          "./admin.html";

      }

    }
  );

}
