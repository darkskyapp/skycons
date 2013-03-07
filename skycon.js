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
        t /= 20000;

        var a = cw * 0.29 - s * 0.5,
            b = cw * 0.06,
            c = Math.cos(t * TWO_PI),
            p = c * TWO_PI / -16;

        ctx.fillStyle = WHITE;
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = s;
        ctx.lineCap = "round";

        cx += (c + 0.5) * b;

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
      };

  Skycon = function(id) {
    var canvas = document.getElementById(id);

    this.context  = canvas.getContext("2d");
    this.interval = undefined;
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

    moon(ctx, t, w * 0.625, h * 0.375, s * 0.75, s * STROKE);
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

    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
  };

  Skycon.SNOW = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    cloud(ctx, t, w * 0.5, h * 0.37, s * 0.9, s * STROKE);
  };

  Skycon.prototype = {
    clear: function() {
      var canvas = this.context.canvas;
      this.context.clearRect(0, 0, canvas.width, canvas.height);
    },
    play: function(draw) {
      var self = this;

      this.pause();
      this.interval = setInterval(function() {
        self.clear();
        draw(self.context, Date.now());
      }, 1000 / 60);
    },
    pause: function() {
      if(this.interval) {
        clearInterval(this.interval);
        this.interval = undefined;
      }
    }
  };
}());
