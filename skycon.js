var Skycon;

(function() {
  "use strict";

  var BLACK  = "#222",
      WHITE  = "#FFF",
      STROKE = 0.09375,
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
      cloud = function(ctx, t, cx, cy, cw, s) {
        t /= 30000;

        var a = cw * 0.21,
            b = cw * 0.12,
            c = cw * 0.24,
            d = cw * 0.28;

        ctx.fillStyle = BLACK;
        puffs(ctx, t, cx, cy, a, b, c, d);

        ctx.fillStyle = WHITE;
        puffs(ctx, t, cx, cy, a, b, c - s, d - s);
      },
      sun = function(ctx, t, cx, cy, cw, s) {
        t /= 120000;

        var a = cw * 0.25 - s * 0.5,
            b = cw * 0.32 + s * 0.5,
            c = cw * 0.50 - s * 0.5,
            i, p, cos, sin;

        ctx.fillStyle = WHITE;
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = s;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.arc(cx, cy, a, 0, TWO_PI, false);
        ctx.fill();
        ctx.stroke();

        for(i = 8; i--; ) {
          p = (t + i / 8) * TWO_PI;
          cos = Math.cos(p);
          sin = Math.sin(p);
          line(ctx, cx + cos * b, cy + sin * b, cx + cos * c, cy + sin * c);
        }
      },
      moon = function(ctx, t, cx, cy, cw, s) {
        t /= 15000;

        var a = cw * 0.29 - s * 0.5,
            b = cw * 0.05,
            c = Math.cos(t * TWO_PI),
            p = c * TWO_PI / -16;

        ctx.fillStyle = WHITE;
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = s;
        ctx.lineCap = "round";

        cx += c * b;

        ctx.beginPath();
        ctx.arc(cx, cy, a, p + TWO_PI / 8, p + TWO_PI * 7 / 8, false);
        ctx.arc(cx + Math.cos(p) * a * TWO_OVER_SQRT_2, cy + Math.sin(p) * a * TWO_OVER_SQRT_2, a, p + TWO_PI * 5 / 8, p + TWO_PI * 3 / 8, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      },
      rain = function(ctx, t, cx, cy, cw, s) {
        t /= 1000;

        var a = cw * 0.16,
            b = TWO_PI * 11 / 12,
            c = TWO_PI *  7 / 12,
            i, p, x, y;

        ctx.fillStyle = BLACK;

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
      sleet = function(ctx, t, cx, cy, cw, s) {
        t /= 750;

        var a = cw * 0.18,
            b = TWO_PI * 11 / 12,
            c = TWO_PI *  7 / 12,
            i, p, x, y;

        ctx.strokeStyle = BLACK;
        ctx.lineWidth = s * 0.5;
        ctx.lineCap = "round";

        for(i = 4; i--; ) {
          p = (t + i / 4) % 1;
          x = cx + ((i - 1.5) / 1.5) * (i === 1 || i === 2 ? -1 : 1) * a;
          y = cy + p * cw;
          line(ctx, x, y - s * 1.5, x, y + s * 1.5);
        }
      },
      snow = function(ctx, t, cx, cy, cw, s) {
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

        ctx.strokeStyle = BLACK;
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
      swoosh = function(ctx, t, cx, cy, r, tail, up) {
        var a = tail,
            b = r * TWO_PI * 5 / 8,
            c = (a * 2) / (a + b),
            ty, sa, ea;

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

        t = (t % 1) * 8;

        ctx.beginPath();

        if(t < c) {
          t = 1 - t / c;
          ctx.moveTo(cx - tail * t, ty);
          ctx.arc(cx, cy, r, sa, ea, up);
        }

        else if(t < 2) {
          t = 1 - (t - c) / (2 - c);
          ctx.arc(cx, cy, r, ea + (sa - ea) * t, ea, up);
        }

        else if(t < 3) {
        }

        else if(t < 3 + c) {
          t = 1 - (t - 3) / c;
          ctx.moveTo(cx - tail, ty);
          ctx.lineTo(cx - tail * t, ty);
        }

        else if(t < 5) {
          t = 1 - (t - (3 + c)) / (2 - c);
          ctx.moveTo(cx - tail, ty);
          ctx.arc(cx, cy, r, sa, ea + (sa - ea) * t, up);
        }

        else {
          ctx.moveTo(cx - tail, ty);
          ctx.arc(cx, cy, r, sa, ea, up);
        }

        ctx.stroke();
      },
      fogbank = function(ctx, t, cx, cy, cw, s) {
        t /= 30000;

        var a = cw * 0.21,
            b = cw * 0.06,
            c = cw * 0.21,
            d = cw * 0.28;

        ctx.fillStyle = BLACK;
        puffs(ctx, t, cx, cy, a, b, c, d);

        ctx.fillStyle = WHITE;
        puffs(ctx, t, cx, cy, a, b, c - s, d - s);
      };

  Skycon = function() {
    this.list     = [];
    this.interval = null;
  };

  Skycon.CLEAR_DAY = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    sun(ctx, t, w * 0.5, h * 0.5, s, s * STROKE);
  };

  Skycon.CLEAR_NIGHT = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    moon(ctx, t, w * 0.5, h * 0.5, s, s * STROKE);
  };

  Skycon.PARTLY_CLOUDY_DAY = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    sun(ctx, t, w * 0.625, h * 0.375, s * 0.75, s * STROKE);
    cloud(ctx, t, w * 0.375, h * 0.625, s * 0.75, s * STROKE);
  };

  Skycon.PARTLY_CLOUDY_NIGHT = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    moon(ctx, t, w * 0.667, h * 0.375, s * 0.75, s * STROKE);
    cloud(ctx, t, w * 0.375, h * 0.625, s * 0.75, s * STROKE);
  };

  Skycon.CLOUDY = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    cloud(ctx, t, w * 0.5, h * 0.5, s, s * STROKE);
  };

  Skycon.RAIN = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    rain(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
  };

  Skycon.SLEET = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    sleet(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
  };

  Skycon.SNOW = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    snow(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
  };

  Skycon.WIND = function(ctx, t) {
    t /= 4000;

    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        cx = w * 0.5,
        cy = h * 0.5,
        cw = Math.min(w, h),
        s  = cw * STROKE;

    ctx.strokeStyle = BLACK;
    ctx.lineWidth = s;
    ctx.lineCap = "round";

    swoosh(ctx, t       , cx, cy - s * 2, s * 1.5, cw * 0.5 - s * 0.5, true);
    swoosh(ctx, t - 0.04, cx + cw * 0.25, cy + s * 2, s, cw * 0.5 - s * 0.5, false);
    swoosh(ctx, t - 0.13, cx + cw * 0.5 - s * 1.5, cy - s * 1.5, s, cw * 0.25 - s * 1.5, true);
  };

  Skycon.FOG = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h),
        k = s * STROKE;

    fogbank(ctx, t, w * 0.5, h * 0.32, s * 0.75, k);

    t /= 5000;

    var a = Math.cos((t       ) * TWO_PI) * s * 0.02,
        b = Math.cos((t + 0.25) * TWO_PI) * s * 0.02,
        c = Math.cos((t + 0.50) * TWO_PI) * s * 0.02,
        d = Math.cos((t + 0.75) * TWO_PI) * s * 0.02,
        n = h * 0.936;

    ctx.strokeStyle = BLACK;
    ctx.lineWidth = k;
    ctx.lineCap = "round";

    line(ctx, a + w * 0.2 + k * 0.5, n - k * 0.5, b + w * 0.8 - k * 0.5, n - k * 0.5);
    line(ctx, c + w * 0.2 + k * 0.5, n - k * 2.5, d + w * 0.8 - k * 0.5, n - k * 2.5);
  };

  Skycon.prototype = {
    set: function(id, draw) {
      /* FIXME: look through the list and try to update the relevant id first */
      this.list.push({
        id: id,
        ctx: document.getElementById(id).getContext("2d"),
        func: draw
      });
    },
    play: function() {
      var list = this.list;

      this.pause();
      this.interval = setInterval(function() {
        var now = Date.now(),
            i, obj;

        for(i = list.length; i--; ) {
          obj = list[i];
          obj.ctx.fillStyle = WHITE;
          obj.ctx.fillRect(0, 0, obj.ctx.canvas.width, obj.ctx.canvas.height);
          obj.func(obj.ctx, now);
        }
      }, 1000 / 60);
    },
    pause: function() {
      if(this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }
  };
}());
