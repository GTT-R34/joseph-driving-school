/*
  Joseph Driving School — site settings.
  Edit the values here; every page reads from this file.
*/
window.JDS = {
  businessName: "Joseph Driving School",
  phoneDisplay: "0412 489 478",
  phoneE164: "+61412489478",

  // Set to true once WhatsApp is confirmed on the number above.
  whatsappEnabled: false,

  facebookUrl: "https://www.facebook.com/josephdrivingschool/",

  // Google Ads conversion tracking. Leave id empty to disable tracking.
  // id looks like "AW-123456789"; each label is the part after the slash
  // in the conversion's "send_to" value.
  googleAds: {
    id: "",
    labels: {
      call: "",      // tap on any call button
      sms: "",       // tap on any text-message button
      whatsapp: "",  // tap on any WhatsApp button
      form: ""       // booking form submitted (fires on /thanks)
    }
  }
};
