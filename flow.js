
class OpticalFlow {
  constructor(step = 8) {
    this.step = step;
    this.flow = new FlowCalculator(step);
    this.previousPixels = null;
  }
  
  update(capture) {
    capture.loadPixels();
    if (capture.pixels.length <= 0) {
      return;
    }

    if (this.previousPixels) {
      // cheap way to ignore duplicate frames
      if (this.same(this.previousPixels, capture.pixels, 4, capture.width)) {
        return;
      }

      this.flow.calculate(this.previousPixels, capture.pixels, capture.width, capture.height);
    }

    this.previousPixels = this.copyImage(capture.pixels, this.previousPixels);
  }
  
  getFlow() {
    return this.flow.flow;
  }
  
  debugDraw() {
    if (this.flow.flow && this.flow.flow.u != 0 && this.flow.flow.v != 0) {
      this.flow.flow.zones.forEach((zone) => {
        if(abs(zone.u) >= sensitivity && abs(zone.y) >= sensitivity){
          line(zone.x, zone.y, zone.x + zone.u, zone.y + zone.v);
        }
    })
    }
  }
  
  copyImage(src, dst) {
    var n = src.length;
    if (!dst || dst.length != n) dst = new src.constructor(n);
    while (n--) dst[n] = src[n];
    return dst;
  }

  same(a1, a2, stride, n) {
    for (var i = 0; i < n; i += stride) {
      if (a1[i] != a2[i]) {
        return false;
      }
    }
    return true;
  }
}

class FlowZone {
  constructor (x, y, u, v) {
    this.x = x;
    this.y = y;
    this.u = u;
    this.v = v;
  }
}

class FlowCalculator {
  constructor(step = 8) {
    this.step = step;
  }

  // assumes rgba images, but only uses one channel
  calculate (oldImage, newImage, width, height) {
    var zones = [];
    var step = this.step;
    var winStep = step * 2 + 1;

    var A2, A1B2, B1, C1, C2;
    var u, v, uu, vv;
    uu = vv = 0;
    var wMax = width - step - 1;
    var hMax = height - step - 1;
    var globalY, globalX, localY, localX;

    for (globalY = step + 1; globalY < hMax; globalY += winStep) {
      for (globalX = step + 1; globalX < wMax; globalX += winStep) {
        A2 = A1B2 = B1 = C1 = C2 = 0;

        for (localY = -step; localY <= step; localY++) {
          for (localX = -step; localX <= step; localX++) {
            var address = (globalY + localY) * width + globalX + localX;

            var gradX = (newImage[(address - 1) * 4]) - (newImage[(address + 1) * 4]);
            var gradY = (newImage[(address - width) * 4]) - (newImage[(address + width) * 4]);
            var gradT = (oldImage[address * 4]) - (newImage[address * 4]);

            A2 += gradX * gradX;
            A1B2 += gradX * gradY;
            B1 += gradY * gradY;
            C2 += gradX * gradT;
            C1 += gradY * gradT;
          }
        }

        var delta = (A1B2 * A1B2 - A2 * B1);

        if (delta !== 0) {
          /* system is not singular - solving by Kramer method */
          var Idelta = step / delta;
          var deltaX = -(C1 * A1B2 - C2 * B1);
          var deltaY = -(A1B2 * C2 - A2 * C1);

          u = deltaX * Idelta;
          v = deltaY * Idelta;
        } else {
          /* singular system - find optical flow in gradient direction */
          var norm = (A1B2 + A2) * (A1B2 + A2) + (B1 + A1B2) * (B1 + A1B2);
          if (norm !== 0) {
            var IGradNorm = step / norm;
            var temp = -(C1 + C2) * IGradNorm;

            u = (A1B2 + A2) * temp;
            v = (B1 + A1B2) * temp;
          } else {
            u = v = 0;
          }
        }

        if (-winStep < u && u < winStep &&
          -winStep < v && v < winStep) {
          uu += u;
          vv += v;
          zones.push(new FlowZone(globalX, globalY, u, v));
        }
      }
    }

    this.flow = {
      zones : zones,
      u : uu / zones.length,
      v : vv / zones.length
    };

    return this.flow;
  };
};