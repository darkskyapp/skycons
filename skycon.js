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
  /*
  function upsample(n, spline) {
    var polyline = [],
        len = spline.length,
        bx  = spline[0],
        by  = spline[1],
        cx  = spline[2],
        cy  = spline[3],
        dx  = spline[4],
        dy  = spline[5],
        i, j, ax, ay, px, qx, rx, sx, py, qy, ry, sy, t;

    for(i = 6; i !== spline.length; i += 2) {
      ax = bx;
      bx = cx;
      cx = dx;
      dx = spline[i    ];
      px = -0.5 * ax + 1.5 * bx - 1.5 * cx + 0.5 * dx;
      qx =        ax - 2.5 * bx + 2.0 * cx - 0.5 * dx;
      rx = -0.5 * ax            + 0.5 * cx           ;
      sx =                   bx                      ;

      ay = by;
      by = cy;
      cy = dy;
      dy = spline[i + 1];
      py = -0.5 * ay + 1.5 * by - 1.5 * cy + 0.5 * dy;
      qy =        ay - 2.5 * by + 2.0 * cy - 0.5 * dy;
      ry = -0.5 * ay            + 0.5 * cy           ;
      sy =                   by                      ;

      for(j = 0; j !== n; ++j) {
        t = j / n;

        polyline.push(
          ((px * t + qx) * t + rx) * t + sx,
          ((py * t + qy) * t + ry) * t + sy
        );
      }
    }

    polyline.push(
      px + qx + rx + sx,
      py + qy + ry + sy
    );

    return polyline;
  }

  function downsample(n, polyline) {
    var len = 0,
        i, dx, dy;

    for(i = 2; i !== polyline.length; i += 2) {
      dx = polyline[i    ] - polyline[i - 2];
      dy = polyline[i + 1] - polyline[i - 1];
      len += Math.sqrt(dx * dx + dy * dy);
    }

    len /= n;

    var small = [],
        target = len,
        min = 0,
        max, t;

    small.push(polyline[0], polyline[1]);

    for(i = 2; i !== polyline.length; i += 2) {
      dx = polyline[i    ] - polyline[i - 2];
      dy = polyline[i + 1] - polyline[i - 1];
      max = min + Math.sqrt(dx * dx + dy * dy);

      if(max > target) {
        t = (target - min) / (max - min);

        small.push(
          polyline[i - 2] + dx * t,
          polyline[i - 1] + dy * t
        );

        target += len;
      }

      min = max;
    }

    small.push(polyline[polyline.length - 2], polyline[polyline.length - 1]);

    return small;
  }
  */

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

  /*
  var WIND_PATH = downsample(47, upsample(8, [
        -0.80, -0.18,
        -0.50,  0.12,
        -0.20,  0.12,
        -0.04, -0.04,
        -0.07, -0.18,
        -0.19, -0.18,
        -0.23, -0.05,
        -0.12,  0.11,
         0.02,  0.16,
         0.20,  0.15,
         0.50,  0.07,
         0.80,  0.37
      ]));
  */

  var WIND_PATH = [
        -0.5000, 0.12,
        -0.4644, 0.13430690324914085,
        -0.42717097194932, 0.14355757110955225,
        -0.3891134673818466, 0.14820365575600708,
        -0.3507753894742625, 0.14881031664060662,
        -0.3125351463474469, 0.14591733792210668,
        -0.27464166874506357, 0.13997453960219935,
        -0.23726724970954327, 0.1313208912009605,
        -0.20055240506742714, 0.12017409341693804,
        -0.1659726911674713, 0.10368211758672327,
        -0.13460664085742255, 0.0816775856291108,
        -0.10636352784000386, 0.0557602217179994,
        -0.08107315941326147, 0.026927514036706516,
        -0.05918618272184482, -0.004568004727257752,
        -0.04086329462384557, -0.038253078003562764,
        -0.03245083648167779, -0.07545904594192666,
        -0.036150568466584966, -0.11348947250703076,
        -0.048975865585701765, -0.14952873879059086,
        -0.07096922190221262, -0.1806542879392,
        -0.10609224168482237, -0.19487141838444783,
        -0.14431142950045012, -0.19585150093116693,
        -0.1809882049050916, -0.18548771283741314,
        -0.20801151157884123, -0.15890384993207426,
        -0.2245483784535796, -0.12437980050319529,
        -0.23243383375294263, -0.08690246279839177,
        -0.2296004531489741, -0.04878787780470974,
        -0.2154558280835902, -0.013182261491162483,
        -0.19619473849990626, 0.019977934587872448,
        -0.17407608002611416, 0.05132478666377703,
        -0.14956072660224143, 0.08083012337890431,
        -0.12233621594934146, 0.10784674072139008,
        -0.09099741424438942, 0.1298667358470287,
        -0.05584391612537645, 0.14509336826337146,
        -0.018606901979267423, 0.1542777591462809,
         0.0193528683752172, 0.15991335071823465,
         0.0575789826008345, 0.16324399340413728,
         0.09594492751723632, 0.1632416789723814,
         0.13418554023831694, 0.16012591849606553,
         0.17220061681150986, 0.15488393273140252,
         0.20974969538322638, 0.14716083593852541,
         0.2459920393277192, 0.13472517190080574,
         0.28106113392513354, 0.11915126125153377,
         0.31581655116831975, 0.10287170876640307,
         0.3509117266878406, 0.08736824741068118,
         0.3868738890092496, 0.07404369484780622,
         0.4240903968243157, 0.06479529754061794,
         0.4623732608295425, 0.06243437889768319,
         0.5, 0.06999999999999994
      ];

  function swoosh(ctx, t, cx, cy, cw, s, color) {
    t /= 6000;

    var i, x, y;

    ctx.strokeStyle = color;
    ctx.lineWidth = s;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(cx + WIND_PATH[0] * cw, cy + WIND_PATH[1] * cw);
    for(i = 2; i !== WIND_PATH.length; i += 2)
      ctx.lineTo(cx + WIND_PATH[i] * cw, cy + WIND_PATH[i + 1] * cw);
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

    swoosh(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
    //leaf(ctx, t, w * 0.5, h * 0.5, s, s * STROKE, color);
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
