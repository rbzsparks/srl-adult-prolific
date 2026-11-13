Qualtrics.SurveyEngine.addOnload(function () {
  /* Device check before consent: desktop/laptop with a screen of at least 1024 x 650 (either orientation). */
  var q = this;
  q.hideNextButton();
  var ua = navigator.userAgent || '';
  var mobileUA = /Mobi|Android|iPhone|iPad|iPod|Tablet|Kindle|Silk|PlayBook|BlackBerry|Opera Mini/i.test(ua);
  var iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  var fine = window.matchMedia ? window.matchMedia('(any-pointer: fine)').matches : true;
  var sw = screen.width, sh = screen.height;
  var bigEnough = Math.max(sw, sh) >= 1024 && Math.min(sw, sh) >= 650;
  var reason = mobileUA || iPadOS ? 'mobile' : (!fine ? 'no_mouse' : (!bigEnough ? 'small_screen' : ''));
  var set = function (k, v) { Qualtrics.SurveyEngine.setEmbeddedData(k, String(v)); };
  set('device_ok', reason ? 0 : 1);
  set('device_reason', reason);
  set('device_screen', sw + 'x' + sh);
  set('device_window', window.innerWidth + 'x' + window.innerHeight);
  setTimeout(function () { q.clickNextButton(); }, 400);
});
