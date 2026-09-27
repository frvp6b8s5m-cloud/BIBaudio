/* PART 1: CURATOR AUTHENTICATION */

"use strict";

const CURATOR_SESSION_KEY =
  "bplugins_curator_authenticated";

/*
  SHA-256 signature for the authorized
  curator credential combination.

  The plaintext credential is intentionally
  not stored in this file.
*/

const CURATOR_SIGNATURE =
  "bd7f377e4dc2e9680da2a8f44df4456e98053feb70ade8d544bcd59b07f87689";


function bytesToHex(buffer) {

  return [...new Uint8Array(buffer)]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


/* PART 2: WEB CRYPTO */

async function sha256(value) {

  const data =
    new TextEncoder()
      .encode(value);


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );


  return bytesToHex(
    digest
  );

}


async function verifyCurator(
  username,
  password
) {

  const candidate =
    await sha256(
      `${username}:${password}`
    );


  return (
    candidate ===
    CURATOR_SIGNATURE
  );

}


/* PART 3: LOGIN ROUTING */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const form =
      document.getElementById(
        "admin-login-form"
      );


    if (!form)
      return;


    const status =
      document.getElementById(
        "admin-login-status"
      );


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const data =
          new FormData(form);


        const username =
          String(
            data.get("username") || ""
          ).trim();


        const password =
          String(
            data.get("password") || ""
          );


        status.textContent =
          "[HASH_GATE // PROCESSING]";


        try {

          const valid =
            await verifyCurator(
              username,
              password
            );


          if (!valid) {

            status.textContent =
              "[ACCESS_DENIED // SIGNATURE_MISMATCH]";

            return;

          }


          sessionStorage.setItem(
            CURATOR_SESSION_KEY,
            "true"
          );


          status.textContent =
            "[ACCESS_GRANTED // ROUTING]";


          location.href =
            "./dashboard.html";

        } catch (error) {

          status.textContent =
            `[ERROR // ${error.message}]`;

        }

      }
    );

  }
);
