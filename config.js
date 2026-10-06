/* ==========================================================================
   SETTINGS YOU MAY CHANGE — login and which content file to use.
   See EDITING-GUIDE.md before changing anything here.
   ========================================================================== */
var CONFIG = {

  /* true = ask for a username and password first. false = go straight in
     (for example for a free demo). */
  requireLogin: true,

  /* The username, exactly as the customer must type it. */
  username: "CaseMentor3917",

  /* The password is NOT stored here, only a scrambled fingerprint of it
     (a "SHA-256 hash"). To change the password: open tools/make-passcode.html
     in your browser, type the new password, and paste the long code it shows
     between the quote marks below. */
  passcodeHash: "985cbd88fc39f7a3fe29310bf97fd1df2380feb6bc46cf6ede69bbb7b8a04ecb",

  /* Which content folder inside data/ to use. "sfl2" = data/sfl2/content.js.
     A different one can also be opened for testing by adding ?content=<name>
     to the web address, e.g. index.html?content=test-every-shape */
  content: "sfl2"
};
