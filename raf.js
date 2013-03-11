var requestInterval, cancelInterval;

(function(global) {
  "use strict";

  var raf = global.requestAnimationFrame       ||
            global.webkitRequestAnimationFrame ||
            global.mozRequestAnimationFrame    ||
            global.oRequestAnimationFrame      ||
            global.msRequestAnimationFrame     ,
      caf = global.cancelAnimationFrame        ||
            global.webkitCancelAnimationFrame  ||
            global.mozCancelAnimationFrame     ||
            global.oCancelAnimationFrame       ||
            global.msCancelAnimationFrame      ;

  if(raf && caf) {
    requestInterval = function(fn) {
      var handle = {value: null, stop: false};

      function loop() {
        if(handle.stop)
          return;

        handle.value = raf(loop);
        fn();
      }

      loop();
      return handle;
    };

    cancelInterval = function(handle) {
      handle.stop = true;
      caf(handle.value);
    };
  }

  else {
    requestInterval = setInterval;
    cancelInterval = clearInterval;
  }
}(this));
