var Skycon;

(function(global) {
  "use strict";

  /* Set up a RequestAnimationFrame shim so we can animate efficiently FOR
   * GREAT JUSTICE. */
  var requestInterval, cancelInterval;

  (function() {
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
  }());

  /* Catmull-rom spline stuffs. */
  function spline(points) {
    var i = points.length,
        c = points[--i],
        b = points[--i],
        a = points[--i],
        j = i * 4,
        coeffs = new Array(j),
        d;

    while(i) {
      d = c;
      c = b;
      b = a;
      a = points[--i];

      coeffs[--j] = -0.5 * a + 1.5 * b - 1.5 * c + 0.5 * d
      coeffs[--j] =        a - 2.5 * b + 2.0 * c - 0.5 * d
      coeffs[--j] = -0.5 * a           + 0.5 * c
      coeffs[--j] =                  b
    }

    return coeffs;
  }

  function dist(x1, y1, x2, y2) {
    x2 -= x1;
    y2 -= y1;
    return Math.sqrt(x2 * x2 + y2 * y2);
  }

  function length(x, y, off) {
    var len = 0,
        u = x[off] + x[off + 1] + x[off + 2] + x[off + 3],
        v = y[off] + y[off + 1] + y[off + 2] + y[off + 3],
        i, t, m, n;

    for(i = 64; i--; ) {
      t = i / 64;
      m = ((x[off + 3] * t + x[off + 2]) * t + x[off + 1]) * t + x[off];
      n = ((y[off + 3] * t + y[off + 2]) * t + y[off + 1]) * t + y[off];

      len += dist(u, v, m, n);
      u = m;
      v = n;
    }

    return len;
  }

  function lengths(x, y) {
    var l = x.length / 4,
        lens = new Array(l),
        sum = 0,
        i;

    for(i = 0; i !== l; ++i) {
      sum += length(x, y, i * 4);
      lens[i] = sum;
    }

    for(i = 0; i !== l; ++i)
      lens[i] /= sum;

    return lens;
  }

  function remap(lens, x) {
    if(x <= 0 || x >= 1)
      return x;

    var t = x * lens.length;

    if(t < 1)
      return lens[0] * t;

    x  = Math.floor(t);
    t -= x;

    return lens[x - 1] * (1 - t) + lens[x] * t;
  }

  function evaluate(spline, x) {
    var t;

    if(x < 0) {
      x = 0;
      t = 0;
    }

    else if(x < 1) {
      t  = x * spline.length / 4;
      x  = Math.floor(t);
      t -= x;
      x *= 4;
    }

    else {
      x = spline.length - 4;
      t = 1;
    }

    return ((spline[x + 3] * t + spline[x + 2]) * t + spline[x + 1]) * t +
      spline[x];
  }

  /* Define skycon things. */
  /* FIXME: I'm *really really* sorry that this code is so gross. Really, I am.
   * I'll try to clean it up eventually! Promise! */
  var KEYFRAME = 500,
      STROKE = 0.08,
      TWO_PI = 2.0 * Math.PI,
      TWO_OVER_SQRT_2 = 2.0 / Math.sqrt(2);

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI, false);
    ctx.fill();
  }

  function line(ctx, ax, ay, bx, by) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  function puff(ctx, t, cx, cy, rx, ry, rmin, rmax) {
    var c = Math.cos(t * TWO_PI),
        s = Math.sin(t * TWO_PI);

    rmax -= rmin;

    circle(
      ctx,
      cx - s * rx,
      cy + c * ry + rmax * 0.5,
      rmin + (1 - c * 0.5) * rmax
    );
  }

  function puffs(ctx, t, cx, cy, rx, ry, rmin, rmax) {
    var i;

    for(i = 5; i--; )
      puff(ctx, t + i / 5, cx, cy, rx, ry, rmin, rmax);
  }

  function cloud(ctx, t, cx, cy, cw, s, color) {
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
  }

  function sun(ctx, t, cx, cy, cw, s, color) {
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
  }

  function moon(ctx, t, cx, cy, cw, s, color) {
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
  }

  function rain(ctx, t, cx, cy, cw, s, color) {
    t /= 1350;

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
  }

  function sleet(ctx, t, cx, cy, cw, s, color) {
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
  }

  function snow(ctx, t, cx, cy, cw, s, color) {
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
  }

  function fogbank(ctx, t, cx, cy, cw, s, color) {
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
  }

  var sx = spline([-0.8, -0.5, -0.2, -0.04, -0.07, -0.19, -0.23, -0.12, 0.02, 0.2, 0.5, 0.8]),
      sy = spline([-0.18, 0.12, 0.12, -0.04, -0.18, -0.18, -0.05, 0.11, 0.16, 0.15, 0.07, 0.37]),
      sl = lengths(sx, sy);

  function swoosh(ctx, t, cx, cy, cw, s, color) {
    t /= 4000;

    var end = t % 1 - 0.15,
        start = end - 0.5,
        i, width;

    start = remap(sl, start);
    end   = remap(sl, end);
    width = end - start;

    ctx.strokeStyle = color;
    ctx.lineWidth = s;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(cx + evaluate(sx, end) * cw, cy + evaluate(sy, end) * cw);
    for(i = 32; i--; )
      ctx.lineTo(cx + evaluate(sx, start + width * i / 32) * cw, cy + evaluate(sy, start + width * i / 32) * cw);
    ctx.stroke();
  }

  function leaf(ctx, t, cx, cy, cw, s, color) {
    var x = cx + evaluate(sx, remap(sl, (t / 4000) % 1)) * cw,
        y = cy + evaluate(sy, remap(sl, (t / 4000) % 1)) * cw,
        a = cw / 6,
        b = a / 3,
        c = 2 * b,
        d = ((t / 4000) % 1) * TWO_PI,
        e = Math.cos(d),
        f = Math.sin(d);

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = s;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(x        , y        , a, d          , d + Math.PI, false);
    ctx.arc(x - b * e, y - b * f, c, d + Math.PI, d          , false);
    ctx.arc(x + c * e, y + c * f, b, d + Math.PI, d          , true );
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.stroke();
  }

  Skycon = function(opts) {
    this.list     = [];
    this.interval = null;
    this.color    = opts && opts.color ? opts.color : "black";
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
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    //swoosh(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
    leaf(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
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
}(this));
