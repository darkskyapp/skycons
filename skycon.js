var Skycon;

(function() {
  "use strict";

  var BLACK  = "#222",
      WHITE  = "#FFF",
      STROKE = 0.085,
      TWO_PI = 2.0 * Math.PI,
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
        var a = cw * 0.25,
            b = cw * 0.32 + s * 0.5,
            c = cw * 0.50 - s * 0.5,
            i, p, cos, sin;

        ctx.fillStyle = BLACK;
        circle(ctx, cx, cy, a);

        ctx.fillStyle = WHITE;
        circle(ctx, cx, cy, a - s);

        ctx.strokeStyle = BLACK;
        ctx.lineWidth = s;
        ctx.lineCap = "round";

        for(i = 8; i--; ) {
          p = (t + i) * TWO_PI / 8;
          cos = Math.cos(p);
          sin = Math.sin(p);
          line(ctx, cx + cos * b, cy + sin * b, cx + cos * c, cy + sin * c);
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

    cloud(ctx, t, w * 0.375, h * 0.625, s * 0.75, s * STROKE);
  };

  Skycon.CLOUDY = function(ctx, t) {
    var w = ctx.canvas.width,
        h = ctx.canvas.height,
        s = Math.min(w, h);

    cloud(ctx, t, w * 0.5, h * 0.5, s, s * STROKE);
  };

  Skycon.prototype = {
    clear: function() {
      var canvas = this.context.canvas;
      this.context.clearRect(0, 0, canvas.width, canvas.height);
    },
    play: function(draw, period) {
      var self = this;

      this.pause();
      this.interval = setInterval(function() {
        self.clear();
        draw(self.context, (Date.now() / period) % 1);
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
