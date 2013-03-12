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


var Skycon;

(function() {
  "use strict";

  var KEYFRAME = 500,
      STROKE = 0.08,
      TWO_PI = 2.0 * Math.PI,
      TWO_OVER_SQRT_2 = 2.0 / Math.sqrt(2),
      circle = function(ctx, x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TWO_PI, false);
        ctx.fill();
      },
      line = function(ctx, ax, ay, bx, by) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      },
      puff = function(ctx, t, cx, cy, rx, ry, rmin, rmax) {
        var c = Math.cos(t * TWO_PI),
            s = Math.sin(t * TWO_PI);

        rmax -= rmin;

        circle(
          ctx,
          cx - s * rx,
          cy + c * ry + rmax * 0.5,
          rmin + (1 - c * 0.5) * rmax
        );
      },
      puffs = function(ctx, t, cx, cy, rx, ry, rmin, rmax) {
        var i;

        for(i = 5; i--; )
          puff(ctx, t + i / 5, cx, cy, rx, ry, rmin, rmax);
      },
      cloud = function(ctx, t, cx, cy, cw, s, color) {
        t /= 30000;

        var a = cw * 0.21,
            b = cw * 0.12,
            c = cw * 0.24,
            d = cw * 0.28;

        ctx.fillStyle = color;
        puffs(ctx, t, cx, cy, a, b, c, d);

        ctx.globalCompositeOperation = 'destination-out';
        puffs(ctx, t, cx, cy, a, b, c - s, d - s);
        ctx.globalCompositeOperation = 'source-over';
      },
      sun = function(ctx, t, cx, cy, cw, s, color) {
        t /= 120000;

        var a = cw * 0.25 - s * 0.5,
            b = cw * 0.32 + s * 0.5,
            c = cw * 0.50 - s * 0.5,
            i, p, cos, sin;

        ctx.strokeStyle = color;
        ctx.lineWidth = s;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.arc(cx, cy, a, 0, TWO_PI, false);
        ctx.stroke();

        for(i = 8; i--; ) {
          p = (t + i / 8) * TWO_PI;
          cos = Math.cos(p);
          sin = Math.sin(p);
          line(ctx, cx + cos * b, cy + sin * b, cx + cos * c, cy + sin * c);
        }
      },
      moon = function(ctx, t, cx, cy, cw, s, color) {
        t /= 15000;

        var a = cw * 0.29 - s * 0.5,
            b = cw * 0.05,
            c = Math.cos(t * TWO_PI),
            p = c * TWO_PI / -16;

        ctx.strokeStyle = color;
        ctx.lineWidth = s;
        ctx.lineCap = "round";

        cx += c * b;

        ctx.beginPath();
        ctx.arc(cx, cy, a, p + TWO_PI / 8, p + TWO_PI * 7 / 8, false);
        ctx.arc(cx + Math.cos(p) * a * TWO_OVER_SQRT_2, cy + Math.sin(p) * a * TWO_OVER_SQRT_2, a, p + TWO_PI * 5 / 8, p + TWO_PI * 3 / 8, true);
        ctx.closePath();
        ctx.stroke();
      },
      rain = function(ctx, t, cx, cy, cw, s, color) {
        t /= 1000;

        var a = cw * 0.16,
            b = TWO_PI * 11 / 12,
            c = TWO_PI *  7 / 12,
            i, p, x, y;

        ctx.fillStyle = color;

        for(i = 4; i--; ) {
          p = (t + i / 4) % 1;
          x = cx + ((i - 1.5) / 1.5) * (i === 1 || i === 2 ? -1 : 1) * a;
          y = cy + p * p * cw;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 1.5);
          ctx.arc(x, y, s * 0.75, b, c, false);
          ctx.fill();
        }
      },
      sleet = function(ctx, t, cx, cy, cw, s, color) {
        t /= 750;

        var a = cw * 0.1875,
            b = TWO_PI * 11 / 12,
            c = TWO_PI *  7 / 12,
            i, p, x, y;

        ctx.strokeStyle = color;
        ctx.lineWidth = s * 0.5;
        ctx.lineCap = "round";

        for(i = 4; i--; ) {
          p = (t + i / 4) % 1;
          x = Math.floor(cx + ((i - 1.5) / 1.5) * (i === 1 || i === 2 ? -1 : 1) * a) + 0.5;
          y = cy + p * cw;
          line(ctx, x, y - s * 1.5, x, y + s * 1.5);
        }
      },
      snow = function(ctx, t, cx, cy, cw, s, color) {
        t /= 3000;

        var a  = cw * 0.16,
            b  = s * 0.75,
            u  = t * TWO_PI * 0.7,
            ux = Math.cos(u) * b,
            uy = Math.sin(u) * b,
            v  = u + TWO_PI / 3,
            vx = Math.cos(v) * b,
            vy = Math.sin(v) * b,
            w  = u + TWO_PI * 2 / 3,
            wx = Math.cos(w) * b,
            wy = Math.sin(w) * b,
            i, p, x, y;

        ctx.strokeStyle = color;
        ctx.lineWidth = s * 0.5;
        ctx.lineCap = "round";

        for(i = 4; i--; ) {
          p = (t + i / 4) % 1;
          x = cx + Math.sin((p + i / 4) * TWO_PI) * a;
          y = cy + p * cw;

          line(ctx, x - ux, y - uy, x + ux, y + uy);
          line(ctx, x - vx, y - vy, x + vx, y + vy);
          line(ctx, x - wx, y - wy, x + wx, y + wy);
        }
      },
      clamp = function(x) {
        return x < 0 ? 0 : x < 1 ? x : 1;
      },
      swoosh = function(ctx, from, to, stroke, cx, cy, r, tail, up, color) {
        var a = stroke * 0.5,
            b = tail,
            c = r * TWO_PI * 5 / 8,
            d = 1 / (a + a + b + c),
            e = a * d,
            f = (a + b) * d,
            g = (a + b + c) * d,
            ty, sa, ea, t;

        if(up) {
          ty = cy + r;
          sa = TWO_PI *  2 / 8;
          ea = TWO_PI * -3 / 8;
        }

        else {
          ty = cy - r;
          sa = TWO_PI * -2 / 8;
          ea = TWO_PI *  3 / 8;
        }

        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = stroke;
        ctx.lineCap = "round";

        ctx.beginPath();

        if(to < e) {
          ctx.arc(
            cx - tail,
            ty,
            clamp(to / e) * stroke * 0.5,
            0,
            TWO_PI,
            false
          );

          ctx.fill();
        }

        else if(from > g) {
          ctx.arc(
            cx + Math.cos(ea) * r,
            cy + Math.sin(ea) * r,
            clamp(1 - (from - g) / (1 - g)) * stroke * 0.5,
            TWO_PI,
            false
          );

          ctx.fill();
        }

        else if(from < f) {
          ctx.moveTo(cx - tail * clamp(1 - from / f), ty);

          if(to < f)
            ctx.lineTo(cx - tail * clamp(1 - to / f), ty);

          else
            ctx.arc(
              cx,
              cy,
              r,
              sa,
              ea + (sa - ea) * clamp(1 - (to - f) / (1 - f)),
              up
            );

          ctx.stroke();
        }

        else {
          ctx.arc(
            cx,
            cy,
            r,
            ea + (sa - ea) * clamp(1 - (from - f) / (1 - f)),
            ea + (sa - ea) * clamp(1 - (to   - f) / (1 - f)),
            up
          );

          ctx.stroke();
        }
      },
      fogbank = function(ctx, t, cx, cy, cw, s, color) {
        t /= 30000;

        var a = cw * 0.21,
            b = cw * 0.06,
            c = cw * 0.21,
            d = cw * 0.28;

        ctx.fillStyle = color;
        puffs(ctx, t, cx, cy, a, b, c, d);

        ctx.globalCompositeOperation = 'destination-out';
        puffs(ctx, t, cx, cy, a, b, c - s, d - s);
        ctx.globalCompositeOperation = 'source-over';
      };

  Skycon = function(params) {
    params = params || {}
    this.list     = [];
    this.interval = null;
    this.color = params.color || "#000000"
  };

  Skycon.CLEAR_DAY = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    sun(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
  };

  Skycon.CLEAR_NIGHT = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    moon(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
  };

  Skycon.PARTLY_CLOUDY_DAY = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    sun(ctx, t, w * 0.625, h * 0.375, s * 0.75, s * STROKE, color);
    cloud(ctx, t, w * 0.375, h * 0.625, s * 0.75, s * STROKE, color);
  };

  Skycon.PARTLY_CLOUDY_NIGHT = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    moon(ctx, t, w * 0.667, h * 0.375, s * 0.75, s * STROKE, color);
    cloud(ctx, t, w * 0.375, h * 0.625, s * 0.75, s * STROKE, color);
  };

  Skycon.CLOUDY = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    cloud(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
  };

  Skycon.RAIN = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    rain(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE, color);
    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE, color);
  };

  Skycon.SLEET = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    sleet(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE, color);
    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE, color);
  };

  Skycon.SNOW = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    snow(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE, color);
    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE, color);
  };

  Skycon.WIND = function(ctx, t, color) {
    t /= 500;

    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        cx = w * 0.5,
        cy = h * 0.5,
        cw = Math.min(w, h),
        s  = cw * STROKE,
        q  = t % 2;

    swoosh(ctx, q - 1, q, s, cx, cy - s * 2, s * 1.5, cw * 0.5 - s * 0.5, true, color);
    swoosh(ctx, q - 1, q, s, cx + cw * 0.25, cy + s * 2, s, cw * 0.5 - s * 0.5, false, color);
    swoosh(ctx, q - 1, q, s, cx + cw * 0.5 - s * 1.5, cy - s * 1.5, s, cw * 0.25 - s * 1.5, true, color);

  };

  Skycon.FOG = function(ctx, t, color) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h),
        k = s * STROKE;

    fogbank(ctx, t, w * 0.5, h * 0.32, s * 0.75, k, color);

    t /= 5000;

    var a = Math.cos((t       ) * TWO_PI) * s * 0.02,
        b = Math.cos((t + 0.25) * TWO_PI) * s * 0.02,
        c = Math.cos((t + 0.50) * TWO_PI) * s * 0.02,
        d = Math.cos((t + 0.75) * TWO_PI) * s * 0.02,
        n = h * 0.936;

    ctx.strokeStyle = color;
    ctx.lineWidth = k;
    ctx.lineCap = "round";

    line(ctx, a + w * 0.2 + k * 0.5, n - k * 0.5, b + w * 0.8 - k * 0.5, n - k * 0.5);
    line(ctx, c + w * 0.2 + k * 0.5, n - k * 2.5, d + w * 0.8 - k * 0.5, n - k * 2.5);
  };

  Skycon.prototype = {
    add: function(id, draw) {
      var obj = {
            id: id,
            ctx: document.getElementById(id).getContext("2d"),
            func: draw
          };

      this.list.push(obj);
      this.draw(obj, KEYFRAME);
    },
    set: function(id, draw) {
      var i;

      for(i = this.list.length; i--; )
        if(this.list[i].id === id) {
          this.list[i].func = draw;
          this.draw(this.list[i], KEYFRAME);
          return;
        }

      this.add(id, draw);
    },
    remove: function(id) {
      var i;

      for(i = this.list.length; i--; )
        if(this.list[i].id === id) {
          this.list.splice(i, 1);
          return;
        }
    },
    draw: function(obj, time) {
      obj.ctx.clearRect(0, 0, obj.ctx.canvas.width, obj.ctx.canvas.height);
      obj.func(obj.ctx, time, this.color);
    },
    play: function() {
      var self = this;

      this.pause();
      this.interval = requestInterval(function() {
        var now = Date.now(),
            i;

        for(i = self.list.length; i--; )
          self.draw(self.list[i], now);
      }, 1000 / 60);
    },
    pause: function() {
      var i;

      if(this.interval) {
        cancelInterval(this.interval);
        this.interval = null;

        for(i = this.list.length; i--; )
          this.draw(this.list[i], KEYFRAME);
      }
    }
  };
}());
