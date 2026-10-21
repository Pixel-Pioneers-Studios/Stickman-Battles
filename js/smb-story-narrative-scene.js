'use strict';
// Cinematic canvas renderer for story narratives. Public API: showNarrativeScene(lines, chapter, callback).
// Scene specs live in window.STORY_SCENE_SPECS[chapterId].

(function () {

  var TYPEWRITE_MS = 14;
  // Clean silhouette by default (see the cape block in _drawFigure).
  var SCENE_CAPE_DEFAULT = false;
  // Holding click or space scrubs at this multiple of normal speed. _FF_ARM stops a plain click from scrubbing.
  var FF_RATE = 4, FF_ARM = 9;
  // Auto-advance target in characters per second of on-screen time. ~24 cps is just above the 20 cps subtitle standard.
  var CIN_CPS = 24, CIN_HOLD_MAX = 300;
  var FOOT_YF = 0.74, DEF_LEFT = 0.26, DEF_RIGHT = 0.74;

  var _canvas, _ctx, _raf;
  var _beats = [], _beatIdx = 0, _typedLen = 0, _lastTypeTime = 0;
  var _callback = null, _chapter = null, _spec = null, _actStyle = null;
  var _trans = null;
  var _t = 0, _beatT = 0;
  var _stars = [];
  var _cam   = { zoom: 1, cx: 0.5, cy: 0.5 };
  var _shakeStr = 0, _shakeDecay = 0;
  var _flashAlpha = 0, _flashColor = '#ffffff', _flashDecay = 0;

  // Off by default: with _cinMode false every path behaves as before.
  // On: beats auto-advance after typing, the camera drifts, and SKIP ends the whole sequence.
  var _cinMode    = false;
  var _cinHold    = 80;
  var _autoT      = 0;
  var _ffHeld     = false;
  var _ptrAt      = 0;
  var _keyFF      = false;
  var _onSkip     = null;
  var _skipRect   = null;
  var _cinLabel   = null;
  var _cinProg    = null;
  var _cinHoldEnd = false;
  var _driftSeed  = 0;

  function _ease(t)         { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function _lerp(a, b, t)   { return a + (b - a) * t; }

  // Motion needs anticipation, fast travel and overshoot. The single smoothstep (_ease) read as floaty.
  function _easeOutCubic(t) { var u = 1 - t; return 1 - u*u*u; }
  function _easeInCubic(t)  { return t*t*t; }
  // Overshoots past 1 and settles back. s controls how far past.
  function _easeOutBack(t, s) {
    s = (s === undefined) ? 1.70158 : s;
    var u = t - 1; return u*u*((s+1)*u + s) + 1;
  }
  // Dips below 0 (wind-up), then drives to 1 and overshoots. For punches, steps and head turns.
  function _easeAnticip(t, back) {
    back = (back === undefined) ? 0.22 : back;
    if (t < 0.30) { var a = t / 0.30; return -back * Math.sin(a * Math.PI); }
    return _easeOutBack((t - 0.30) / 0.70, 1.35);
  }
  // Damped settle, for a motion that stops hard and rings out.
  function _easeSettle(t) {
    if (t >= 1) return 1;
    return 1 - Math.cos(t * Math.PI * 3.1) * Math.exp(-t * 5.2) * (1 - t);
  }
  function _clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }

  // Figure is authored at ~85px. Scale it toward a fifth of frame height, clamped so small windows don't distort and big ones don't become billboards.
  // Authored `scale` still multiplies on top.
  function _figScale() {
    if (!_canvas || !_canvas.height) return 1;
    return _clamp(_canvas.height / 430, 1, 2.4);
  }
  function _rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
  }

  function _parseBeats(lines) {
    var beats = [], group = [];
    function pushRun(runLines) {
      if (!runLines.length) return;
      var hasQuote = runLines.some(function(l){ return l.trim().charAt(0) === '"'; });
      var speaker = 'none';
      if (hasQuote) {
        var lo = runLines.join(' ').toLowerCase();
        speaker = (lo.indexOf('your voice') !== -1 || lo.indexOf('you said') !== -1 ||
                   lo.indexOf('you replied') !== -1 || lo.indexOf('you asked') !== -1)
                  ? 'player' : 'npc';
      }
      beats.push({ lines: runLines.filter(function(l){return l.trim()!==''; }), speaker: speaker, hasQuote: hasQuote });
    }
    function flush() {
      if (!group.length) return;
      // Split narrator and dialogue so narration stays out of bubbles
      var cur = [], curIsQuote = null;
      for (var i = 0; i < group.length; i++) {
        var isQ = group[i].trim().charAt(0) === '"';
        if (curIsQuote === null) curIsQuote = isQ;
        if (isQ !== curIsQuote) { pushRun(cur); cur = []; curIsQuote = isQ; }
        cur.push(group[i]);
      }
      pushRun(cur);
      group = [];
    }
    for (var i = 0; i < lines.length; i++) { if (lines[i]==='') flush(); else group.push(lines[i]); }
    flush();
    return beats;
  }

  function _getTheme(ch) {
    var a = (ch && ch.arena) || (ch && ch.style) || '';
    var w = ((ch && ch.world) || '').toLowerCase();
    if (a==='forest'||w.indexOf('forest')!==-1) return 'forest';
    if (a==='cave'||w.indexOf('underground')!==-1) return 'cave';
    if (a==='volcano'||w.indexOf('lava')!==-1) return 'volcano';
    if (w.indexOf('home')!==-1||w.indexOf('city')!==-1||a==='homeYard'||a==='homeAlley'||a==='homeRooftop'||a==='suburb'||a==='city') return 'city';
    if (w.indexOf('multiverse')!==-1||w.indexOf('dimension')!==-1) return 'multiverse';
    return 'fracture';
  }

  function _initStars(count, w, h) {
    _stars = [];
    for (var i = 0; i < count; i++)
      _stars.push({ x: Math.random()*w, y: Math.random()*h,
                    r: Math.random()*1.6+0.3, twinkle: Math.random()*Math.PI*2,
                    speed: Math.random()*0.02+0.01 });
  }

  var _noiseCv = null;
  function _noisePattern(c) {
    if (!_noiseCv) {
      _noiseCv = document.createElement('canvas');
      _noiseCv.width = 128; _noiseCv.height = 128;
      var nc = _noiseCv.getContext('2d');
      var img = nc.createImageData(128, 128);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() * 255;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
        img.data[i+3] = 34;
      }
      nc.putImageData(img, 0, 0);
    }
    return c.createPattern(_noiseCv, 'repeat');
  }
  var _vig = { grad: null, w: 0, h: 0 };
  function _drawVignette(c, w, h) {
    if (!_vig.grad || _vig.w !== w || _vig.h !== h) {
      var g = c.createRadialGradient(w*0.5, h*0.46, Math.min(w,h)*0.42, w*0.5, h*0.52, Math.max(w,h)*0.74);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.15)');
      g.addColorStop(1, 'rgba(0,0,0,0.40)');
      _vig.grad = g; _vig.w = w; _vig.h = h;
    }
    c.save(); c.fillStyle = _vig.grad; c.fillRect(0, 0, w, h); c.restore();
  }
  function _drawGrain(c, w, h, t) {
    c.save();
    c.globalAlpha = 0.05;
    var ox = (t * 7) % 128, oy = (t * 13) % 128;
    c.translate(-ox, -oy);
    c.fillStyle = _noisePattern(c);
    c.fillRect(0, 0, w + 128, h + 128);
    c.restore();
  }
  // Parallax: depth 0 is glued to the camera, 1 cancels camera pan entirely.
  function _plx(w, depth) { return (_cam.cx - 0.5) * w * depth; }

  function _camUpdate(bs, beatT) {
    if (bs && bs.camAnim && bs.camAnim.length) {
      var arr = bs.camAnim, result = arr[arr.length-1];
      for (var i = 0; i < arr.length-1; i++) {
        if (beatT >= arr[i].at && beatT < arr[i+1].at) {
          var p = _ease(_clamp((beatT-arr[i].at)/(arr[i+1].at-arr[i].at),0,1));
          result = {
            zoom: _lerp(arr[i].zoom||1,    arr[i+1].zoom||1,    p),
            cx:   _lerp(arr[i].cx  ||0.5,  arr[i+1].cx  ||0.5,  p),
            cy:   _lerp(arr[i].cy  ||0.5,  arr[i+1].cy  ||0.5,  p),
          };
          break;
        }
      }
      _cam.zoom = result.zoom||1; _cam.cx = result.cx!==undefined?result.cx:0.5; _cam.cy = result.cy!==undefined?result.cy:0.5;
    } else if (bs && bs.cam) {
      var ls = bs.cam.lerpSpeed || 0.08;
      _cam.zoom = _lerp(_cam.zoom, bs.cam.zoom||1,   ls);
      _cam.cx   = _lerp(_cam.cx,   bs.cam.cx!==undefined?bs.cam.cx:0.5, ls);
      _cam.cy   = _lerp(_cam.cy,   bs.cam.cy!==undefined?bs.cam.cy:0.5, ls);
    } else {
      _cam.zoom = _lerp(_cam.zoom, 1,   0.06);
      _cam.cx   = _lerp(_cam.cx,   0.5, 0.06);
      _cam.cy   = _lerp(_cam.cy,   0.5, 0.06);
    }
    if (bs && bs.camShake) {
      for (var si = 0; si < bs.camShake.length; si++) {
        var sh = bs.camShake[si];
        if (beatT >= sh.at && beatT <= sh.at+1) {
          _shakeStr = sh.strength || 10;
          _shakeDecay = _shakeStr / (sh.dur || 18);
        }
      }
    }
    if (_shakeStr > 0) _shakeStr = Math.max(0, _shakeStr - _shakeDecay);
    if (_flashAlpha > 0) _flashAlpha = Math.max(0, _flashAlpha - _flashDecay);

    // Slow drift so long holds never look frozen. Authored camAnim still plays as written.
    if (_cinMode) {
      var d = _t * 0.0031 + _driftSeed;
      _cam.cx   += Math.sin(d) * 0.0045 + Math.sin(d * 0.37) * 0.0022;
      _cam.cy   += Math.cos(d * 0.83) * 0.0030;
      _cam.zoom *= 1 + Math.sin(d * 0.61) * 0.0035;
    }
  }

  function _camBegin(c, w, h) {
    c.save();
    var shx = _shakeStr > 0 ? (Math.random()*2-1)*_shakeStr : 0;
    var shy = _shakeStr > 0 ? (Math.random()*2-1)*_shakeStr*0.55 : 0;
    var cx = _cam.cx * w, cy = _cam.cy * h;
    c.translate(cx+shx, cy+shy);
    c.scale(_cam.zoom, _cam.zoom);
    c.translate(-cx, -cy);
  }
  function _camEnd(c) { c.restore(); }

  // playerPos / npcPos: [{at:frame, x:0-1, state, facing, alpha, scale}]. Optional y lifts the figure off the foot line (fraction of height, negative is up).
  function _getFigAnim(posArr, beatT) {
    if (!posArr || !posArr.length) return null;
    var cur = posArr[0], nxt = null;
    for (var i = 0; i < posArr.length; i++) {
      if (beatT >= posArr[i].at) { cur = posArr[i]; nxt = posArr[i+1]||null; }
    }
    if (!nxt || cur.x === undefined || nxt.x === undefined) return cur;
    var _u = _clamp((beatT-cur.at)/(nxt.at-cur.at),0,1);
    // Bodies anticipate and settle. ease:'linear' or 'smooth' on a keyframe opts out.
    var _mode = nxt.ease || cur.ease || 'anticip';
    var p = _mode === 'linear' ? _u
          : _mode === 'smooth' ? _ease(_u)
          : _mode === 'settle' ? _easeSettle(_u)
          : _easeAnticip(_u, 0.10);
    // Moving figures arc slightly up mid-move. Suppressed for linear keyframes.
    var _arcY = (_mode === 'linear') ? 0
              : -Math.sin(_u * Math.PI) * Math.abs(nxt.x - cur.x) * 26;
    return {
      arcY:   _arcY,
      x:      _lerp(cur.x, nxt.x, p),
      y:      _lerp(cur.y || 0, nxt.y || 0, p),
      state:  cur.state, facing: cur.facing,
      alpha:  _lerp(cur.alpha!==undefined?cur.alpha:1, nxt.alpha!==undefined?nxt.alpha:1, p),
      scale:  cur.scale || 1, show: cur.show !== false,
      expr:   cur.expr,
    };
  }

  function _drawFloor(c, w, h, top, bot, sheen) {
    var fy = h * FOOT_YF;
    var g = c.createLinearGradient(0,fy,0,h);
    g.addColorStop(0,top); g.addColorStop(1,bot);
    c.fillStyle=g; c.fillRect(0,fy+2,w,h*(1-FOOT_YF));
    // Horizon light strip, grounds the scene
    c.save();
    var hg = c.createLinearGradient(0, fy-5, 0, fy+13);
    hg.addColorStop(0,   'rgba(255,255,255,0)');
    hg.addColorStop(0.45, sheen || 'rgba(160,190,255,0.16)');
    hg.addColorStop(1,   'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(0, fy-5, w, 18);
    // Faint wet-surface sheen falling off below the horizon
    var sg = c.createLinearGradient(0, fy+2, 0, h);
    sg.addColorStop(0, sheen || 'rgba(150,180,255,0.06)');
    sg.addColorStop(0.55, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(0, fy+2, w, h-fy-2);
    c.restore();
  }

  function _drawFractureBg(c, w, h, t) {
    var g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#07001a'); g.addColorStop(0.55,'#0e002a'); g.addColorStop(1,'#040010');
    c.fillStyle=g; c.fillRect(0,0,w,h);
    // Nebula blobs, slow breathing depth
    var nebs=[[0.24,0.30,0.26,'85,40,190'],[0.72,0.20,0.22,'50,20,140'],[0.50,0.58,0.30,'35,10,95']];
    var nOff=_plx(w,0.6);
    for (var ni=0;ni<nebs.length;ni++) {
      var nb=nebs[ni], nx=nb[0]*w+nOff, ny=nb[1]*h, nr=nb[2]*Math.min(w,h)*1.4;
      var ng=c.createRadialGradient(nx,ny,0,nx,ny,nr);
      var na=0.16+Math.sin(t*0.005+ni*2.1)*0.05;
      ng.addColorStop(0,'rgba('+nb[3]+','+na+')'); ng.addColorStop(1,'rgba('+nb[3]+',0)');
      c.fillStyle=ng; c.fillRect(nx-nr,ny-nr,nr*2,nr*2);
    }
    var fOff=_plx(w,0.8);
    for (var i=0;i<_stars.length;i++) { var s=_stars[i]; var sx=((s.x+fOff)%w+w)%w; c.globalAlpha=Math.max(0,0.35+Math.sin(t*s.speed+s.twinkle)*0.3); c.fillStyle='#ccaaff'; c.beginPath(); c.arc(sx,s.y,s.r,0,Math.PI*2); c.fill(); }
    c.globalAlpha=1;
    var cracks=[[0.10,0.18,0.38,0.72],[0.60,0.08,0.86,0.62],[0.18,0.50,0.52,0.92],[0.68,0.28,0.96,0.76]];
    c.save(); for (var ci=0;ci<cracks.length;ci++) { var cr=cracks[ci]; c.globalAlpha=0.08+Math.sin(t*0.015+ci)*0.05; c.strokeStyle='#aa44ff'; c.lineWidth=1.2; c.beginPath(); c.moveTo(cr[0]*w,cr[1]*h); c.lineTo(cr[2]*w,cr[3]*h); c.stroke(); } c.restore();
    _drawFloor(c,w,h,'#06001a','#040010','rgba(180,110,255,0.11)');
  }

  function _drawCityBg(c, w, h, t, opts) {
    opts=opts||{};
    var g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,opts.skyTop||'#08102a'); g.addColorStop(0.5,opts.skyMid||'#0f1a38'); g.addColorStop(1,opts.skyBot||'#0a1020');
    c.fillStyle=g; c.fillRect(0,0,w,h);
    // Stars, wrapped so parallax never empties the sky
    var stOff=_plx(w,0.85);
    for (var si=0;si<_stars.length;si++) { var s2=_stars[si]; if(s2.y>h*0.38)continue; var sx=((s2.x+stOff)%w+w)%w; c.globalAlpha=0.20+Math.sin(t*s2.speed+s2.twinkle)*0.10; c.fillStyle='#ffffff'; c.beginPath(); c.arc(sx,s2.y,s2.r*0.8,0,Math.PI*2); c.fill(); }
    c.globalAlpha=1;
    // Moon and halo (key light)
    if (!opts.noMoon) {
      var mx=w*0.16+_plx(w,0.8), my=h*0.15, mCol=opts.moonTint||'#dfe6f5';
      var mg=c.createRadialGradient(mx,my,6,mx,my,h*0.22);
      mg.addColorStop(0,'rgba(210,225,255,0.28)'); mg.addColorStop(0.4,'rgba(180,200,255,0.08)'); mg.addColorStop(1,'rgba(180,200,255,0)');
      c.fillStyle=mg; c.fillRect(mx-h*0.22,my-h*0.22,h*0.44,h*0.44);
      c.fillStyle=mCol; c.beginPath(); c.arc(mx,my,15,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(150,170,210,0.5)';
      c.beginPath(); c.arc(mx-5,my+3,3.2,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(mx+6,my-4,2.1,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(mx+2,my+7,1.6,0,Math.PI*2); c.fill();
    }
    // Far skyline, hazy, strong parallax
    var farBlds=[[0,0.42,0.05],[0.06,0.36,0.06],[0.14,0.44,0.04],[0.20,0.34,0.07],[0.30,0.40,0.05],[0.37,0.31,0.06],[0.46,0.38,0.05],[0.53,0.33,0.07],[0.62,0.41,0.05],[0.70,0.35,0.06],[0.78,0.30,0.07],[0.87,0.38,0.06],[0.94,0.34,0.06]];
    c.save(); c.translate(_plx(w,0.5),0);
    c.fillStyle=opts.farColor||'#0d1730';
    for (var fb=0;fb<farBlds.length;fb++) { var f=farBlds[fb]; c.fillRect(f[0]*w-w*0.05,f[1]*h,f[2]*w,(FOOT_YF-f[1])*h+4); }
    c.restore();
    // Haze band between skylines
    var hz=c.createLinearGradient(0,h*0.38,0,h*FOOT_YF+2);
    hz.addColorStop(0,'rgba(95,125,195,0)'); hz.addColorStop(1,opts.hazeColor||'rgba(95,125,195,0.13)');
    c.fillStyle=hz; c.fillRect(0,h*0.38,w,h*(FOOT_YF-0.38)+2);
    // Near skyline with deterministic lit windows
    var blds=[[0,0.56,0.06],[0.04,0.44,0.07],[0.09,0.50,0.05],[0.13,0.38,0.07],[0.19,0.48,0.08],[0.25,0.40,0.06],[0.29,0.33,0.08],[0.35,0.44,0.05],[0.38,0.37,0.09],[0.45,0.46,0.05],[0.48,0.30,0.10],[0.56,0.39,0.07],[0.61,0.47,0.06],[0.65,0.35,0.09],[0.72,0.42,0.05],[0.75,0.28,0.10],[0.82,0.40,0.07],[0.87,0.48,0.05],[0.90,0.42,0.07],[0.95,0.50,0.05]];
    c.save(); c.translate(_plx(w,0.15),0);
    c.fillStyle=opts.bldColor||'#060e1c';
    for (var bi=0;bi<blds.length;bi++) { var b=blds[bi]; c.fillRect(b[0]*w,b[1]*h,b[2]*w,(1-b[1])*h); }
    for (bi=0;bi<blds.length;bi++) {
      var b2=blds[bi], bx=b2[0]*w, bw2=b2[2]*w, bty=b2[1]*h;
      var cols=Math.min(4,Math.max(1,Math.floor(bw2/18))), rows=Math.min(8,Math.max(2,Math.floor((h*FOOT_YF-bty)/30)));
      for (var wy=0;wy<rows;wy++) for (var wx=0;wx<cols;wx++) {
        if (bty+10+wy*28 > h*0.60) break;
        var seed=bi*97+wy*13+wx*7, rr=_mHash(seed);
        if (rr<0.60) continue;
        var flick=Math.sin(t*0.018+seed*2.7)>-0.75?1:0;
        c.globalAlpha=0.34*flick*(0.55+0.45*_mHash(seed+1));
        c.fillStyle=opts.winColor||'#ffd9a0';
        c.fillRect(bx+5+wx*((bw2-10)/cols), bty+10+wy*28, 3.5, 5.5);
      }
    }
    c.globalAlpha=1; c.restore();
    _drawFloor(c,w,h,'#0c1628','#07101a',opts.sheen);
  }

  function _drawForestBg(c,w,h,t) {
    var g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#060e08'); g.addColorStop(0.5,'#091608'); g.addColorStop(1,'#050b05'); c.fillStyle=g; c.fillRect(0,0,w,h);
    var stOff=_plx(w,0.85);
    for (var si=0;si<_stars.length;si++) { var s=_stars[si]; if(s.y>h*0.38)continue; var sx=((s.x+stOff)%w+w)%w; c.globalAlpha=0.18+Math.sin(t*s.speed+s.twinkle)*0.10; c.fillStyle='#cceecc'; c.beginPath(); c.arc(sx,s.y,s.r*0.7,0,Math.PI*2); c.fill(); } c.globalAlpha=1;
    // Moonlight through the canopy
    var mx=w*0.62+_plx(w,0.8), my=h*0.12;
    var mg=c.createRadialGradient(mx,my,4,mx,my,h*0.30);
    mg.addColorStop(0,'rgba(200,235,205,0.20)'); mg.addColorStop(1,'rgba(200,235,205,0)');
    c.fillStyle=mg; c.fillRect(mx-h*0.30,my-h*0.30,h*0.6,h*0.6);
    function tree(x,sc,col,topY) { c.fillStyle=col; c.beginPath(); c.moveTo(x,h*0.79); c.lineTo(x-52*sc,h*0.79); c.lineTo(x-32*sc,h*0.56); c.lineTo(x-22*sc,h*0.56); c.lineTo(x-42*sc,h*0.38); c.lineTo(x-16*sc,h*0.38); c.lineTo(x-26*sc,h*(topY||0.20)); c.lineTo(x+26*sc,h*(topY||0.20)); c.lineTo(x+16*sc,h*0.38); c.lineTo(x+42*sc,h*0.38); c.lineTo(x+22*sc,h*0.56); c.lineTo(x+32*sc,h*0.56); c.lineTo(x+52*sc,h*0.79); c.closePath(); c.fill(); }
    // Far treeline, hazy, blue-shifted
    c.save(); c.translate(_plx(w,0.5),0);
    tree(w*0.02,0.42,'#0a1510',0.42); tree(w*0.14,0.5,'#0a1510',0.38); tree(w*0.33,0.46,'#0a1510',0.40); tree(w*0.52,0.52,'#0a1510',0.36); tree(w*0.68,0.44,'#0a1510',0.42); tree(w*0.88,0.5,'#0a1510',0.38);
    c.restore();
    var hz=c.createLinearGradient(0,h*0.40,0,h*FOOT_YF+2);
    hz.addColorStop(0,'rgba(120,180,140,0)'); hz.addColorStop(1,'rgba(120,180,140,0.09)');
    c.fillStyle=hz; c.fillRect(0,h*0.40,w,h*(FOOT_YF-0.40)+2);
    c.save(); c.translate(_plx(w,0.15),0);
    tree(w*0.07,0.72,'#030805'); tree(w*0.20,0.88,'#030805'); tree(w*0.80,0.84,'#030805'); tree(w*0.93,0.74,'#030805');
    c.restore();
    // Drifting ground mist
    c.save();
    for (var mi=0;mi<4;mi++) {
      var mmx=((_mHash(mi)*w)+t*(0.15+mi*0.06))%(w*1.3)-w*0.15;
      c.globalAlpha=0.05+Math.sin(t*0.008+mi*1.7)*0.02;
      c.fillStyle='#aaccaa';
      c.beginPath(); c.ellipse(mmx,h*FOOT_YF-8,90+mi*35,14,0,0,Math.PI*2); c.fill();
    }
    c.restore();
    _drawFloor(c,w,h,'#091408','#050a05','rgba(140,200,150,0.09)');
  }

  function _drawCaveBg(c,w,h,t) {
    var g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#030507'); g.addColorStop(1,'#08090d'); c.fillStyle=g; c.fillRect(0,0,w,h);
    // Far rock wall, stalactites and stalagmites with parallax
    c.save(); c.translate(_plx(w,0.45),0);
    c.fillStyle='#0a0d14';
    for (var fi=0;fi<9;fi++) { var fx=(fi/8)*w+Math.sin(fi*2.3)*30; var fh=h*(0.16+Math.sin(fi*1.7)*0.10); c.beginPath(); c.moveTo(fx-16,0); c.lineTo(fx+16,0); c.lineTo(fx,fh); c.closePath(); c.fill(); }
    for (var gi=0;gi<7;gi++) { var gx=(gi/6)*w+Math.sin(gi*3.1)*40+w*0.06; var gh=h*(0.10+Math.sin(gi*2.6)*0.06); c.beginPath(); c.moveTo(gx-20,h*FOOT_YF+2); c.lineTo(gx+20,h*FOOT_YF+2); c.lineTo(gx,h*FOOT_YF-gh); c.closePath(); c.fill(); }
    c.restore();
    // Depth fog
    var fg=c.createLinearGradient(0,h*0.35,0,h*FOOT_YF+2);
    fg.addColorStop(0,'rgba(40,70,120,0)'); fg.addColorStop(1,'rgba(40,70,120,0.10)');
    c.fillStyle=fg; c.fillRect(0,h*0.35,w,h*(FOOT_YF-0.35)+2);
    c.save(); c.translate(_plx(w,0.12),0);
    c.fillStyle='#050708'; for (var i=0;i<13;i++) { var sx=(i/12)*w+Math.sin(i*1.8)*18; var sh=h*(0.10+Math.sin(i*2.4)*0.09); c.beginPath(); c.moveTo(sx-11,0); c.lineTo(sx+11,0); c.lineTo(sx,sh); c.closePath(); c.fill(); }
    c.restore();
    var cCols=['#0044cc','#4400cc','#0077aa']; for (var ci=0;ci<6;ci++) { var cxx=(ci/5)*w*0.78+w*0.11+Math.sin(ci*1.5)*28; var cyy=h*(0.54+Math.sin(ci*2.2)*0.09); c.save(); c.globalAlpha=0.13+Math.sin(t*0.025+ci)*0.07; c.fillStyle=cCols[ci%cCols.length]; c.shadowColor=cCols[ci%cCols.length]; c.shadowBlur=14; c.beginPath(); c.moveTo(cxx,cyy-18); c.lineTo(cxx+7,cyy); c.lineTo(cxx,cyy+9); c.lineTo(cxx-7,cyy); c.closePath(); c.fill(); c.restore(); }
    _drawFloor(c,w,h,'#050608','#030405','rgba(80,140,220,0.10)');
  }


  function _drawPortal(c, x, y, ht, color, alpha, t) {
    c.save(); c.globalAlpha=alpha;
    var grd=c.createRadialGradient(x,y,0,x,y,ht*0.7);
    grd.addColorStop(0,color+'55'); grd.addColorStop(1,'transparent');
    c.fillStyle=grd; c.fillRect(x-ht*0.7,y-ht*0.7,ht*1.4,ht*1.4);
    c.strokeStyle=color; c.lineWidth=4+Math.sin(t*0.08)*1.5; c.shadowColor=color; c.shadowBlur=18;
    c.beginPath(); c.moveTo(x,y-ht*0.5); c.lineTo(x,y+ht*0.5); c.stroke();
    c.lineWidth=1.5; c.shadowBlur=6;
    for (var i=-3;i<=3;i++) { var len=(4-Math.abs(i))*10; var py=y+i*(ht*0.5/4); c.globalAlpha=alpha*0.5; c.beginPath(); c.moveTo(x,py); c.lineTo(x-len,py); c.stroke(); c.beginPath(); c.moveTo(x,py); c.lineTo(x+len,py); c.stroke(); }
    c.restore();
  }

  function _drawSkyCracks(c, w, h, progress, t) {
    var lines=[[0.15,0,0.40,0.28],[0.40,0.28,0.55,0.08],[0.55,0.08,0.78,0.32],[0.78,0.32,0.60,0.45],[0.30,0.12,0.22,0.38],[0.65,0.20,0.85,0.18]];
    c.save();
    for (var li=0;li<lines.length;li++) { var ln=lines[li]; var lp=Math.max(0,Math.min(1,progress*lines.length-li)); if(lp<=0)continue; var sx=ln[0]*w,sy=ln[1]*h,ex=sx+(ln[2]*w-sx)*lp,ey=sy+(ln[3]*h-sy)*lp; c.globalAlpha=0.5+Math.sin(t*0.04+li)*0.2; c.strokeStyle=li%2===0?'#dd88ff':'#ffffff'; c.lineWidth=2-li*0.2; c.shadowColor='#cc44ff'; c.shadowBlur=10; c.beginPath(); c.moveTo(sx,sy); c.lineTo(ex,ey); c.stroke(); }
    c.restore();
  }

  function _drawFireGlow(c, w, h, intensity, t) {
    c.save(); var fy=h*0.55;
    var fg=c.createLinearGradient(0,fy,0,h);
    var flicker=0.6+Math.sin(t*0.09)*0.2+Math.sin(t*0.17)*0.1;
    fg.addColorStop(0,'rgba(255,80,0,0)'); fg.addColorStop(0.3,'rgba(220,60,0,'+(0.22*flicker*intensity)+')'); fg.addColorStop(0.7,'rgba(180,40,0,'+(0.35*flicker*intensity)+')'); fg.addColorStop(1,'rgba(100,20,0,'+(0.28*flicker*intensity)+')');
    c.fillStyle=fg; c.fillRect(0,fy,w,h-fy);
    c.globalAlpha=0.10*intensity; c.fillStyle='#221100';
    for (var si=0;si<5;si++) { var sx=(si/4)*w*0.8+w*0.1+Math.sin(t*0.03+si)*25; var sy=h*0.45-Math.sin(t*0.05+si*1.3)*20; c.beginPath(); c.ellipse(sx,sy,50+si*10,30,0,0,Math.PI*2); c.fill(); }
    c.restore();
  }

  function _drawPhone(c, x, y, alpha, t) {
    c.save(); c.globalAlpha=Math.min(1,alpha); var glow=0.4+Math.sin(t*0.08)*0.3;
    c.fillStyle='#223344'; c.strokeStyle='#44aaff'; c.lineWidth=2; c.shadowColor='#44aaff'; c.shadowBlur=10*glow;
    _rrect(c,x-12,y-20,24,38,4); c.fill(); c.stroke();
    c.globalAlpha=Math.min(1,alpha*glow); c.fillStyle='#aaddff'; c.fillRect(x-9,y-16,18,25);
    c.globalAlpha=Math.min(1,alpha*0.9); c.fillStyle='#003355'; c.font='5px monospace';
    for (var li=0;li<4;li++) { c.fillRect(x-7,y-13+li*6,14+Math.sin(li)*3,2); }
    c.restore();
  }

  function _drawFragmentPulse(c, x, y, color, t) {
    c.save(); var r=45+Math.sin(t*0.06)*8; var alpha=0.15+Math.sin(t*0.08)*0.08;
    var pg=c.createRadialGradient(x,y-30,5,x,y-30,r); pg.addColorStop(0,color+'88'); pg.addColorStop(0.6,color+'33'); pg.addColorStop(1,'transparent');
    c.fillStyle=pg; c.globalAlpha=alpha; c.beginPath(); c.arc(x,y-30,r,0,Math.PI*2); c.fill();
    c.globalAlpha=0.35+Math.sin(t*0.06)*0.15; c.strokeStyle=color; c.lineWidth=2; c.shadowColor=color; c.shadowBlur=12;
    c.beginPath(); c.arc(x,y-30,r*0.7+Math.sin(t*0.05)*5,0,Math.PI*2); c.stroke();
    c.restore();
  }

  function _drawStaticNoise(c, w, h, alpha) {
    c.save(); c.globalAlpha=alpha; c.strokeStyle='#88ccff'; c.lineWidth=0.7;
    for (var i=0;i<8;i++) { var y=Math.random()*h; c.beginPath(); c.moveTo(0,y); var x=0; while(x<w){x+=Math.random()*30+5;var dy=Math.random()*12-6;c.lineTo(x,y+dy);} c.stroke(); }
    c.restore();
  }

  function _drawDoor(c, x, y, w2, h2, crackProgress, t) {
    c.save(); c.fillStyle='#1a1a2a'; c.strokeStyle='#445566'; c.lineWidth=3; c.fillRect(x-w2/2,y-h2,w2,h2); c.strokeRect(x-w2/2,y-h2,w2,h2);
    c.globalAlpha=0.6+Math.sin(t*0.07)*0.2; c.fillStyle='#003366'; c.strokeStyle='#0088ff'; c.lineWidth=2; c.shadowColor='#0088ff'; c.shadowBlur=10;
    var hy=y-h2*0.4; c.beginPath(); for (var hi=0;hi<6;hi++){var ang=hi/6*Math.PI*2;var hx=x+Math.cos(ang)*14;var hyy=hy+Math.sin(ang)*14;if(hi===0)c.moveTo(hx,hyy);else c.lineTo(hx,hyy);} c.closePath(); c.fill(); c.stroke();
    c.globalAlpha=0.8; c.fillStyle='#334455'; c.shadowBlur=0;
    var bp=[[x-w2/2+6,y-h2+8],[x+w2/2-6,y-h2+8],[x-w2/2+6,y-8],[x+w2/2-6,y-8]];
    for (var bi=0;bi<bp.length;bi++){c.beginPath();c.arc(bp[bi][0],bp[bi][1],4,0,Math.PI*2);c.fill();}
    if (crackProgress>0) { var lx=x-w2/2+2,lh=h2*crackProgress,lg=c.createLinearGradient(lx,y-lh,lx+12,y-lh+lh); lg.addColorStop(0,'rgba(100,200,255,0.9)'); lg.addColorStop(1,'rgba(50,100,255,0.4)'); c.globalAlpha=0.8*crackProgress; c.fillStyle=lg; c.fillRect(lx,y-lh,6,lh); c.shadowColor='#88ccff'; c.shadowBlur=20; c.fillRect(lx,y-lh,6,lh); }
    c.restore();
  }

  function _drawCacheItems(c, w, h, alpha, t) {
    c.save(); var items=[{x:0.42,y:0.64,col:'#44ffaa'},{x:0.52,y:0.60,col:'#ffaa44'},{x:0.35,y:0.68,col:'#44aaff'},{x:0.60,y:0.65,col:'#ff44aa'},{x:0.48,y:0.70,col:'#aaffaa'}];
    for (var i=0;i<items.length;i++) { var it=items[i]; c.globalAlpha=alpha*(0.5+Math.sin(t*0.06+i)*0.3); c.fillStyle=it.col; c.shadowColor=it.col; c.shadowBlur=14; c.beginPath(); c.arc(it.x*w,it.y*h,5,0,Math.PI*2); c.fill(); c.globalAlpha=alpha*0.4; c.fillStyle=it.col; c.fillRect(it.x*w-8,it.y*h+8,16,3); }
    c.restore();
  }

  function _drawSmoke(c, w, h, t, alpha) {
    c.save(); for (var i=0;i<6;i++) { var sx=0.15*w+(i/5)*0.70*w; var sy=h*FOOT_YF-10-Math.sin(t*0.03+i)*15; var r=25+i*8; c.globalAlpha=alpha*(0.12+Math.sin(t*0.04+i)*0.05); c.fillStyle='#221100'; c.beginPath(); c.arc(sx,sy,r,0,Math.PI*2); c.fill(); } c.restore();
  }


  // Radial speed lines (manga impact)
  function _drawSpeedLines(c, cx, cy, count, color, alpha, t) {
    c.save(); c.strokeStyle=color; c.shadowColor=color; c.shadowBlur=6;
    for (var i=0;i<count;i++) {
      var angle=(i/count)*Math.PI*2+t*0.015;
      var r1=55+Math.sin(i*2.3+t*0.04)*22;
      var r2=r1+90+Math.sin(i*1.7+t*0.03)*45;
      c.globalAlpha=alpha*(0.5+Math.sin(i*1.9)*0.4);
      c.lineWidth=0.8+Math.sin(i*2.1)*0.6;
      c.beginPath(); c.moveTo(cx+Math.cos(angle)*r1,cy+Math.sin(angle)*r1); c.lineTo(cx+Math.cos(angle)*r2,cy+Math.sin(angle)*r2); c.stroke();
    }
    c.restore();
  }

  // Expanding shockwave ring
  function _drawShockwave(c, cx, cy, progress, color, alpha) {
    c.save();
    var r=progress*220;
    c.globalAlpha=alpha*(1-progress*0.7);
    c.strokeStyle=color; c.shadowColor=color; c.shadowBlur=22;
    c.lineWidth=5*(1-progress*0.6);
    c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.stroke();
    if (progress<0.6) { c.globalAlpha=alpha*(1-progress)*0.4; c.lineWidth=2; c.beginPath(); c.arc(cx,cy,r*0.65,0,Math.PI*2); c.stroke(); }
    c.restore();
  }

  // Burst of impact sparks
  function _drawImpactSparks(c, cx, cy, count, color, progress, t) {
    c.save();
    for (var i=0;i<count;i++) {
      var angle=(i/count)*Math.PI*2+i*0.4;
      var speed=60+Math.sin(i*2.1)*30;
      var sx=cx+Math.cos(angle)*speed*progress;
      var sy=cy+Math.sin(angle)*speed*progress+progress*progress*80;
      var sp_alpha=(1-progress)*(0.7+Math.sin(i*1.9)*0.3);
      c.globalAlpha=Math.max(0,sp_alpha);
      c.fillStyle=color; c.shadowColor=color; c.shadowBlur=8;
      c.beginPath(); c.arc(sx,sy,3*(1-progress*0.5),0,Math.PI*2); c.fill();
      // Spark tail
      c.strokeStyle=color; c.lineWidth=1.5; c.globalAlpha=Math.max(0,sp_alpha*0.5);
      var tx=cx+Math.cos(angle)*speed*progress*0.6; var ty=cy+Math.sin(angle)*speed*progress*0.6+progress*progress*50;
      c.beginPath(); c.moveTo(tx,ty); c.lineTo(sx,sy); c.stroke();
    }
    c.restore();
  }

  // Energy burst explosion from a point
  function _drawEnergyBurst(c, cx, cy, progress, color, alpha) {
    c.save();
    var r=progress*130;
    var grd=c.createRadialGradient(cx,cy,0,cx,cy,r);
    grd.addColorStop(0,color+'cc'); grd.addColorStop(0.4,color+'55'); grd.addColorStop(1,'transparent');
    c.globalAlpha=alpha*(1-progress);
    c.fillStyle=grd; c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fill();
    // Jagged energy spikes
    c.strokeStyle=color; c.lineWidth=2; c.shadowColor=color; c.shadowBlur=14;
    for (var i=0;i<8;i++) {
      var angle=(i/8)*Math.PI*2;
      var spikeR=r*(0.7+Math.sin(i*2.3)*0.3);
      c.globalAlpha=alpha*(1-progress)*0.8;
      c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx+Math.cos(angle)*spikeR,cy+Math.sin(angle)*spikeR); c.stroke();
    }
    c.restore();
  }

  // Ground impact cracks spreading from a point
  function _drawGroundCrack(c, cx, cy, progress, color) {
    c.save(); c.strokeStyle=color||'#aaaaaa'; c.shadowColor=color||'#aaaaaa'; c.shadowBlur=8;
    var arms=[[0,1],[0.2,0.8],[-.2,0.8],[0.5,0.7],[-.5,0.7],[0.35,1],[-.35,1]];
    for (var i=0;i<arms.length;i++) {
      var dx=arms[i][0]*120*progress, dy=arms[i][1]*50*progress;
      var lp=Math.min(1,progress*2);
      c.globalAlpha=(1-progress*0.5)*0.7;
      c.lineWidth=3*(1-i*0.1)*(1-progress*0.3);
      c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx+dx*lp,cy+dy*lp); c.stroke();
      if (lp>0.5) { c.lineWidth*=0.6; c.beginPath(); c.moveTo(cx+dx*lp,cy+dy*lp); c.lineTo(cx+dx*lp+Math.cos(i)*20*progress,cy+dy*lp+15*progress); c.stroke(); }
    }
    c.restore();
  }

  // Motion ghost trail for a moving figure
  function _drawMotionBlur(c, fromX, fromY, toX, toY, color, alpha, steps) {
    steps=steps||4;
    c.save();
    for (var i=0;i<steps;i++) {
      var p=i/steps;
      var mx=_lerp(fromX,toX,p), my=_lerp(fromY,toY,p);
      var ga=alpha*(1-p)*0.35;
      if (ga<=0) continue;
      _drawFigure(c,mx,my,color,1,'run',_t+i*3,ga,0.9*_figScale());
    }
    c.restore();
  }

  function _drawSkyBleed(c, w, h, alpha, t) {
    c.save(); c.globalAlpha=alpha*(0.5+Math.sin(t*0.03)*0.15);
    var sbg=c.createLinearGradient(0,0,0,h*0.45); sbg.addColorStop(0,'rgba(150,50,255,0.4)'); sbg.addColorStop(0.5,'rgba(200,100,255,0.18)'); sbg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=sbg; c.fillRect(0,0,w,h*0.45); c.restore();
  }

  function _drawObjectiveMarker(c, mx, my, color, alpha, t) {
    c.save(); c.globalAlpha=alpha*(0.6+Math.sin(t*0.06)*0.3);
    c.fillStyle=color||'#ffcc44'; c.shadowColor=color||'#ffcc44'; c.shadowBlur=18;
    c.beginPath(); c.arc(mx,my,6+Math.sin(t*0.06)*2,0,Math.PI*2); c.fill();
    c.strokeStyle=color||'#ffcc44'; c.lineWidth=2; c.beginPath(); c.moveTo(mx,my-8); c.lineTo(mx,my-50); c.stroke();
    for (var ci=0;ci<3;ci++) { var cy2=my-60-ci*12+((t*2)%36); c.globalAlpha=alpha*(0.8-ci*0.25); c.beginPath(); c.moveTo(mx-7,cy2); c.lineTo(mx,cy2-8); c.lineTo(mx+7,cy2); c.stroke(); }
    c.restore();
  }

  function _drawEchoText(c, text, color, alpha, w, h, t) {
    c.save(); c.font='italic 18px \'Segoe UI\', serif'; c.textAlign='center';
    for (var ei=0;ei<4;ei++) {
      c.globalAlpha=alpha*(0.35-ei*0.08)*(0.5+Math.sin(t*0.03+ei)*0.3);
      c.fillStyle=color||'#aaccff'; c.shadowColor=color||'#aaccff'; c.shadowBlur=10;
      c.fillText(text,w*0.5+ei*6,h*0.33+ei*16);
    }
    c.textAlign='left'; c.restore();
  }

  // Stick figure──────────────────────────────────────────────────
  var _reflPass = false;
  // Acting memory is keyed per figure ('p', 'n', 'x3'). _drawFigure is stateless; the caller names the figure via _figKey.
  var _figMem = {}, _figKey = null;
  var _FIG_BLEND = 14;   // frames to carry one state's pose into the next

  // Fighter look: black body, neon outline in the character colour, no face. Two passes of one skeleton.
  // window.SCENE_FIGURE_CLASSIC = true restores the solid figure with a face.
  var _figPass = 0;
  var _FIG_OUTLINE = 3.6;
  var _FIG_INK = '#08080d';
  var _lwDesc = null, _sbDesc = null;
  function _figPassBegin(c, pass) {
    var proto = Object.getPrototypeOf(c);
    _lwDesc = _lwDesc || Object.getOwnPropertyDescriptor(proto, 'lineWidth');
    _sbDesc = _sbDesc || Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
    if (!_lwDesc || !_sbDesc) return false;
    if (pass === 1) {
      Object.defineProperty(c, 'lineWidth', { configurable: true,
        get: function () { return _lwDesc.get.call(this); },
        set: function (v) { _lwDesc.set.call(this, v + _FIG_OUTLINE); } });
    } else {
      // The black pass must not throw a dark glow over the outline under it.
      Object.defineProperty(c, 'shadowBlur', { configurable: true,
        get: function () { return 0; },
        set: function () { _sbDesc.set.call(this, 0); } });
    }
    return true;
  }
  function _figPassEnd(c) { delete c.lineWidth; delete c.shadowBlur; }

  function _drawFigure(c, x, y, color, facing, state, t, alpha, scale, expr) {
    if (!_figPass && !window.SCENE_FIGURE_CLASSIC) {
      var _ok = false;
      try {
        _figPass = 1;
        _ok = _figPassBegin(c, 1);
        if (_ok) { _drawFigure(c, x, y, color, facing, state, t, alpha, scale, expr); _figPassEnd(c); }
        if (_ok) {
          _figPass = 2;
          _figPassBegin(c, 2);
          _drawFigure(c, x, y, color, facing, state, t, alpha, scale, expr);
        }
      } finally { _figPassEnd(c); _figPass = 0; }
      if (_ok) return;
    }
    var _neon = color;
    if (_figPass === 2) color = _FIG_INK;
    c.save();
    var _a = Math.max(0, alpha !== undefined ? alpha : 1);
    c.globalAlpha = _a;
    scale = scale || 1;
    // Contact shadow is solved after the pose so it carries weight: it tracks the hip and shrinks as the body rises.
    var _shDraw = (!_reflPass && _a > 0.4 && _figPass !== 1);
    if (scale !== 1) { c.translate(x, y); c.scale(scale, scale); c.translate(-x, -y); }

    var isTalk   = state === 'talk';
    var isWalk   = state === 'walk';
    var isRun    = state === 'run';
    var isCrouch = state === 'crouch';
    var isLook   = state === 'look';
    var isAttack = state === 'attack';
    var isHit    = state === 'hit';
    var isReach  = state === 'reach';
    var isFall   = state === 'fall';
    var isKneel  = state === 'kneel';
    var isFloat  = state === 'float';
    var isGuard  = state === 'guard';
    var isListen = state === 'listen';
    var isPoint  = state === 'point';

    // Keyframed rig (smb-figure-rig.js). A clip for this state sets the pose and skips the sine path below. States without a clip fall back to the old code.
    // The canvas transform already applies scale, so the rig solves unscaled.
    // Event clips (attack, hit) run off _beatT so they start on the beat, not mid-swing.
    var _rig = null;
    if (typeof FigureRig !== 'undefined' && FigureRig.hasClip(state)) {
      // Ambient loops get an x-based phase so pairs don't move in lockstep. Event clips must not, or they start mid-swing.
      var _evt   = isAttack || isHit;
      var _heldC = FigureRig.isHeld && FigureRig.isHeld(state);
      // Acting memory (_figMem): when the figure took its state and the pose it left, so a change is a move, not a jump cut.
      var _m = null;
      if (_figKey) {
        _m = _figMem[_figKey] || (_figMem[_figKey] = { state: state, since: -9999, from: null, last: null });
        if (_m.state !== state) { _m.from = _m.last; _m.state = state; _m.since = _t; }
      }
      var _sinceT = _m ? (_t - _m.since) : _beatT;
      // Strikes and hits restart each beat. Entered poses carry over, so a kneeling figure stays kneeling.
      var _rigT  = _evt ? Math.min(_beatT, _sinceT) : (_heldC ? _sinceT : t);
      var _phase = _evt ? 0 : (x * 7) % 40;
      var _pose  = FigureRig.sample(state, _rigT, { phase: _phase });
      if (_pose && _m) {
        if (_m.from && _sinceT < _FIG_BLEND && FigureRig.blend) {
          _pose = FigureRig.blend(_m.from, _pose, _easeOutCubic(_sinceT / _FIG_BLEND), {});
        }
        _m.last = _pose;
      }
      if (_pose) _rig = FigureRig.solve(_pose, x, y, 1, facing);
    }

    // Body lean: offsets hip from shoulder
    var torsoLen  = 34;
    var torsoLean = 0;
    if (isRun)    torsoLean =  0.22 * facing;
    if (isAttack) torsoLean =  0.28 * facing;
    if (isHit)    torsoLean = -0.32 * facing;
    if (isFall)   torsoLean = -0.50 * facing;
    if (isReach)  torsoLean =  0.38 * facing;
    if (isTalk)   torsoLean =  0.08 * facing;
    if (isPoint)  torsoLean =  0.14 * facing;

    var floatY  = isFloat ? -16 + Math.sin(t*0.04)*4 : 0;
    var crouchY = isCrouch ? 14 : isKneel ? 18 : 0;
    var breathY = Math.sin(t*0.038) * 1.4;
    var talkBob = isTalk ? Math.sin(t*0.14) * 1.0 : 0;
    var walkBob = (isWalk||isRun) ? Math.abs(Math.sin(t*(isRun?0.28:0.20))) * (isRun?4:3) : 0;
    var hitSnap = isHit ? Math.max(0, 1-_beatT*0.04)*6 : 0;
    // Listener: occasional short nodding bursts, otherwise still
    var listenNod = (isListen && Math.sin(t*0.011) > 0.55) ? Math.abs(Math.sin(t*0.15))*2.2 : 0;
    // Slow weight shift so idle figures don't freeze
    var sway = (state === 'idle' || isListen) ? Math.sin(t*0.016)*1.6 : 0;

    var headR  = 13;
    var offY   = breathY + talkBob + walkBob + floatY - crouchY + listenNod;

    // Overlapping action: hips lead, chest follows, head arrives last.
    // The head bob is sampled at an earlier time: analytic lag, no per-figure state.
    var LAG = 5.5;                       // frames the head trails the hips
    var tL  = t - LAG;
    var breathYL = Math.sin(tL*0.038) * 1.4;
    var talkBobL = isTalk ? Math.sin(tL*0.14) * 1.0 : 0;
    var walkBobL = (isWalk||isRun) ? Math.abs(Math.sin(tL*(isRun?0.28:0.20))) * (isRun?4:3) : 0;
    var floatYL  = isFloat ? -16 + Math.sin(tL*0.04)*4 : 0;
    var offYHead = breathYL + talkBobL + walkBobL + floatYL - crouchY + listenNod;
    // Head drifts against the lean, like a neck holding a head up.
    var headDX = (offY - offYHead) * 0.28 * facing;

    // Squash and stretch on torso and head radius, not canvas scale, so limbs keep their length.
    var _sq = 0;
    if (isHit)  _sq = -Math.max(0, 1 - _beatT * 0.055) * 0.16;
    if (isFall) _sq =  Math.min(0.13, _beatT * 0.004);
    if (isAttack) _sq = Math.max(0, 1 - Math.abs(_beatT * 0.06 - 0.55) * 3) * 0.07;
    torsoLen *= (1 + _sq);
    headR    *= (1 - _sq * 0.45);

    var headCY = y - 72 + offYHead;
    var neckY  = headCY + headR + 2;
    var shldrY = y - 72 + offY + 13 + 2 + 6;
    var hipX   = x + Math.sin(torsoLean) * torsoLen - hitSnap * facing + sway;
    var hipY   = shldrY + Math.cos(Math.abs(torsoLean)) * torsoLen;
    var headX  = x + headDX;

    // The rig owns the skeleton when it has a clip. Face, cape and shadow read these variables and follow the keyframed pose.
    if (_rig) {
      headX  = _rig.head.x;
      headCY = _rig.head.y;
      headR  = _rig.headR;
      neckY  = _rig.neck.y;
      shldrY = _rig.shoulder.y;
      hipX   = _rig.hip.x;
      hipY   = _rig.hip.y;
    }

    if (_shDraw) {
      c.save();
      var _shFloat = state === 'float';
      // Rise of the body above its rest pose, used for both size and softness.
      var _shLift = _clamp((-offY + crouchY) / 26, -0.5, 1);
      c.globalAlpha = _a * (_shFloat ? 0.12 : 0.26) * (1 - _shLift * 0.45);
      c.fillStyle = '#000000';
      c.beginPath();
      c.ellipse(hipX * 0.55 + x * 0.45, y + 14,
                (_shFloat ? 17 : 26) * scale * (1 - _shLift * 0.30),
                4.5 * scale * (1 - _shLift * 0.22), 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    c.strokeStyle = color; c.lineWidth = 4.5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = color; c.shadowBlur = isTalk ? 10 : isAttack ? 14 : isHit ? 8 : 4;

    c.fillStyle = color; c.beginPath(); c.arc(headX, headCY, headR + (_figPass === 1 ? _FIG_OUTLINE * 0.5 : 0), 0, Math.PI*2); c.fill();

    // Rim light: cool key light catching the upper-left of the head
    if (!_reflPass && !_figPass) {
      c.save();
      c.strokeStyle = 'rgba(235,242,255,0.32)'; c.lineWidth = 1.6; c.shadowBlur = 0;
      c.beginPath(); c.arc(headX, headCY, headR - 0.9, Math.PI * 0.95, Math.PI * 1.55); c.stroke();
      c.restore();
    }

    if (!_figPass) {
    var _feExpr   = expr || 'neutral';
    var _feEyeOff = facing * 4.5;
    if (isHit) _feEyeOff *= -0.5;
    var _feEyeY = headCY - 1.5;
    var _feE1x  = headX + _feEyeOff * 0.5;
    var _feE2x  = headX + _feEyeOff * 0.5 + facing * 5;

    // Periodic blink (per-figure phase offset so pairs don't blink in sync)
    var _blink = !isHit && ((t + ((x * 13) | 0)) % 235) < 7;
    if (_blink) {
      c.save();
      c.strokeStyle = 'rgba(0,0,0,0.70)'; c.lineWidth = 1.7; c.shadowBlur = 0; c.lineCap = 'round';
      c.beginPath(); c.moveTo(_feE1x - 2.2, _feEyeY); c.lineTo(_feE1x + 2.2, _feEyeY); c.stroke();
      c.beginPath(); c.moveTo(_feE2x - 2.2, _feEyeY); c.lineTo(_feE2x + 2.2, _feEyeY); c.stroke();
      c.restore();
    } else {
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(_feE1x, _feEyeY, 2.4, 0, Math.PI*2); c.fill();
      c.beginPath(); c.arc(_feE2x, _feEyeY, 2.4, 0, Math.PI*2); c.fill();

      // Half-lid: paint head color over the top portion of each eye
      if (_feExpr === 'cool' || _feExpr === 'serene') {
        c.fillStyle = color;
        c.fillRect(_feE1x - 2.6, _feEyeY - 2.4, 5.2, 1.6);
        c.fillRect(_feE2x - 2.6, _feEyeY - 2.4, 5.2, 1.6);
      }

      if (!isHit) {
        c.fillStyle = 'rgba(0,0,0,0.88)';
        c.beginPath(); c.arc(_feE1x + facing * 0.4, _feEyeY, 1.2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(_feE2x + facing * 0.4, _feEyeY, 1.2, 0, Math.PI*2); c.fill();
      } else {
        c.fillStyle = 'rgba(200,0,0,0.75)';
        c.beginPath(); c.arc(_feE1x, _feEyeY, 1.5, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(_feE2x, _feEyeY, 1.5, 0, Math.PI*2); c.fill();
      }
    }

    // Eyebrows: one line above each eye; nose side lower is determined, higher is worried
    var _feBrowY = headCY - 7.5;
    c.strokeStyle = 'rgba(0,0,0,0.65)';
    c.lineWidth   = 1.8;
    c.lineCap     = 'round';
    for (var _feBI = 0; _feBI < 2; _feBI++) {
      var _feBEx   = _feBI === 0 ? _feE1x : _feE2x;
      var _feNoseX = _feBEx - facing * 2.0;
      var _feEarX  = _feBEx + facing * 2.5;
      var _feNoseY = _feBrowY, _feEarY = _feBrowY;
      if (isHit) {
        _feNoseY -= 2.0; _feEarY += 0.6;
      } else if (isAttack || _feExpr === 'focused' || _feExpr === 'intense') {
        _feNoseY += 2.0; _feEarY -= 0.6;
      } else if (_feExpr === 'cool') {
        _feNoseY += 1.0; _feEarY -= 0.3;
      }
      c.beginPath(); c.moveTo(_feEarX, _feEarY); c.lineTo(_feNoseX, _feNoseY); c.stroke();
    }

    c.lineWidth = 2;
    if (isTalk) {
      var mw = 5 + Math.abs(Math.sin(t*0.18)) * 3;
      c.strokeStyle = 'rgba(0,0,0,0.45)';
      c.beginPath(); c.arc(headX + _feEyeOff*0.3, headCY+5, mw, 0.1, Math.PI-0.1); c.stroke();
    } else if (isHit) {
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); c.moveTo(headX-4, headCY+5); c.lineTo(headX+4, headCY+5); c.stroke();
    } else if (_feExpr === 'cool' || _feExpr === 'serene') {
      // Smirk: inner corner flat, outer corner lifts
      c.strokeStyle = 'rgba(0,0,0,0.50)';
      c.lineWidth = 1.8;
      var _smMid = headX + facing * 1.5;
      c.beginPath();
      c.moveTo(_smMid - 3.5, headCY + 5.5);
      c.quadraticCurveTo(_smMid + 1, headCY + 6, _smMid + 5, headCY + 4);
      c.stroke();
    } else if (_feExpr === 'intense') {
      c.strokeStyle = 'rgba(190,0,0,0.45)';
      c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(headX - 3.5, headCY+5); c.lineTo(headX + 4.5, headCY+5); c.stroke();
    } else if (isAttack) {
      c.strokeStyle = 'rgba(200,0,0,0.40)';
      c.beginPath(); c.arc(headX + _feEyeOff*0.2, headCY+4, 4, 0, Math.PI, true); c.stroke();
    }
    // No mouth on neutral or focused: reads stoic.
    }

    // The face code leaves strokeStyle and lineWidth set. Restore the body's pen before the torso and limbs draw.
    c.strokeStyle = color; c.lineWidth = 4.5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = color; c.shadowBlur = isTalk ? 10 : isAttack ? 14 : isHit ? 8 : 4;

    // Cape, behind the torso. Only drawn when window.SCENE_CAPE is true, since a filled shape there hides the back arm.
    var _capeOn = (typeof window.SCENE_CAPE === 'boolean') ? window.SCENE_CAPE : SCENE_CAPE_DEFAULT;
    if (_capeOn) {
    var _cd  = -facing;
    var _cT  = typeof frameCount !== 'undefined' ? frameCount : t * 1.5;
    // Narrowed so the cape trails the figure instead of covering it. Its own wind phase (LAG) makes cloth follow the body.
    var _cWv = Math.sin(_cT * 0.082) * (isFall || isHit ? 6 : 3.4);
    var _cDr = Math.sin(_cT * 0.058 + 0.5) * 2.2;
    var _cLag = (offY - offYHead) * 0.9;   // cloth trails the torso's rise and fall
    var _cTX = x + _cd * (27 + _cWv);
    var _cTY = hipY + 24 + _cDr + _cLag;
    var _cA  = alpha !== undefined ? alpha : 1;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(x + _cd * 2, shldrY - 12);
    c.bezierCurveTo(
      x + _cd * (23 + _cWv * 0.5), shldrY,
      x + _cd * (32 + _cWv * 0.8), hipY - 5,
      _cTX, _cTY);
    c.bezierCurveTo(
      x + _cd * (16 + _cWv * 0.4), hipY + 8,
      x + _cd * (7  + _cWv * 0.2), hipY - 8,
      x + _cd * 3, shldrY);
    c.closePath();
    c.fillStyle = color; c.globalAlpha = _cA * 0.30;
    c.shadowColor = color; c.shadowBlur = 16; c.fill();
    c.strokeStyle = color; c.lineWidth = 1.8;
    c.globalAlpha = _cA * 0.88; c.shadowBlur = 14;
    c.beginPath();
    c.moveTo(x + _cd * 2, shldrY - 12);
    c.bezierCurveTo(
      x + _cd * (23 + _cWv * 0.5), shldrY,
      x + _cd * (32 + _cWv * 0.8), hipY - 5,
      _cTX, _cTY);
    c.stroke();
    c.lineWidth = 1; c.globalAlpha = _cA * 0.38; c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(x + _cd * 3, shldrY - 4);
    c.bezierCurveTo(
      x + _cd * (15 + _cWv * 0.3), hipY - 10,
      x + _cd * (23 + _cWv * 0.5), hipY + 5,
      _cTX - _cd * 5, _cTY - 5);
    c.stroke();
    c.restore();

    }

    // Torso bends through the chest, a real joint in the rig, so a coiled punch curves the spine.
    c.lineWidth = 5.0;
    c.beginPath();
    if (_rig) { c.moveTo(_rig.neck.x, _rig.neck.y); c.quadraticCurveTo(_rig.chest.x, _rig.chest.y, hipX, hipY); }
    else      { c.moveTo(headX, neckY);             c.quadraticCurveTo(x, (neckY+hipY)*0.5, hipX, hipY); }
    c.stroke();
    c.lineWidth = 4.5;

    var aBase = shldrY + 5;
    var laAng, raAng;
    if (isAttack) {
      // Dominant arm swings through in a strike arc.
      // Eases back first (anticipation), drives through, overshoots and settles. A linear ramp read as weightless.
      var swing = _easeAnticip(_clamp(_beatT * 0.052, 0, 1));
      laAng = facing > 0 ? (Math.PI*0.30 + swing*Math.PI*0.55) : (Math.PI*0.90 - swing*Math.PI*0.55);
      raAng = facing > 0 ? (-0.55 + swing*0.15) : (Math.PI*1.55 - swing*0.15);
    } else if (isHit) {
      // Rings out from the impact pose rather than snapping to it.
      var _hs = _easeSettle(_clamp(_beatT * 0.035, 0, 1));
      laAng  = Math.PI*0.30 - facing*0.5 * _hs;
      raAng  = 0.40 + facing*0.4 * _hs;
    } else if (isReach) {
      laAng  = facing > 0 ? Math.PI*0.88 : Math.PI*0.12;
      raAng  = facing > 0 ? Math.PI*0.76 : Math.PI*0.24;
    } else if (isFall) {
      laAng  = Math.PI*0.28 + Math.sin(t*0.06)*0.15;
      raAng  = 0.48 + Math.sin(t*0.07)*0.15;
    } else if (isGuard) {
      laAng  = Math.PI*0.72;
      raAng  = 0.18;
    } else if (isFloat) {
      laAng  = Math.PI*0.44 + Math.sin(t*0.04)*0.12;
      raAng  = -0.44 + Math.sin(t*0.04)*0.12;
    } else if (isKneel) {
      laAng  = Math.PI*0.40; raAng = -0.30;
    } else if (isLook) {
      laAng  = Math.PI*0.70 + Math.sin(t*0.05)*0.15; raAng = -0.15 + Math.sin(t*0.05)*0.12;
    } else if (isPoint) {
      // One arm extended level toward facing, the other resting
      if (facing > 0) { laAng = Math.PI*0.52 + Math.sin(t*0.03)*0.06; raAng = -0.10 + Math.sin(t*0.045)*0.04; }
      else            { laAng = 0.10 - Math.sin(t*0.045)*0.04;        raAng = -0.40 + Math.cos(t*0.03)*0.06; }
    } else if (isTalk) {
      // Layered gesture cycles so speech doesn't loop like a metronome
      laAng  = Math.PI*0.55 + Math.sin(t*0.12)*0.20 + Math.sin(t*0.027)*0.16;
      raAng  = -0.28 - Math.sin(t*0.12)*0.16 - Math.sin(t*0.033)*0.13;
    } else if (isRun) {
      laAng  = Math.PI*0.50 + Math.sin(t*0.28+Math.PI)*0.50; raAng = -0.45 + Math.sin(t*0.28)*0.50;
    } else if (isWalk) {
      laAng  = Math.PI*0.50 + Math.sin(t*0.20+Math.PI)*0.30; raAng = -0.35 + Math.sin(t*0.20)*0.30;
    } else if (isCrouch) {
      laAng  = Math.PI*0.60; raAng = -0.45;
    } else {
      laAng  = Math.PI*0.52 + Math.sin(t*0.03)*0.08; raAng = -0.40 + Math.cos(t*0.03)*0.08;
    }

    var armLen = 26;

    // Tapered limbs (upper heavier than fore). Far-side limbs are darker and pushed away from the camera so the back arm doesn't vanish into the torso.
    function _shade(hex, k) {
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#4488ff');
      if (!m) return hex;
      var r = Math.round(parseInt(m[1],16) * k), g = Math.round(parseInt(m[2],16) * k), bl = Math.round(parseInt(m[3],16) * k);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    var _backCol = _shade(color, 0.72);

    // Two-segment bone from solved joint positions, tapering toward the extremity.
    function _bone(a, b, cJ, w1, w2) {
      c.lineWidth = w1;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      c.lineWidth = w2;
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(cJ.x, cJ.y); c.stroke();
      c.lineWidth = 4.5;
    }

    function _limb(ang, ox) {
      var mx = ox + Math.cos(ang)*armLen*0.5, my = aBase + Math.sin(ang)*armLen*0.5;
      var ex = ox + Math.cos(ang)*armLen,     ey = aBase + Math.sin(ang)*armLen;
      c.lineWidth = 4.8;
      c.beginPath(); c.moveTo(ox, aBase); c.lineTo(mx, my); c.stroke();
      c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(mx, my); c.lineTo(ex, ey); c.stroke();
      c.lineWidth = 4.5;
      return { x: ex, y: ey };
    }

    // Smear: low-alpha copies at the pose the arm held a few frames ago, only while the arm is fast.
    var _smearAmt = 0;
    if (isAttack) _smearAmt = Math.max(0, 1 - Math.abs(_clamp(_beatT*0.052,0,1) - 0.52) * 3.4);
    else if (isRun) _smearAmt = 0.45;

    // Rig smear: the pose from a few frames earlier, which is the arc the limb travelled.
    if (_rig && !_reflPass) {
      var _sTrail = isAttack ? 3 : (isRun ? 2 : 0);
      if (_sTrail) {
        c.save(); c.shadowBlur = 0; c.lineCap = 'round';
        for (var _sg = 1; _sg <= _sTrail; _sg++) {
          var _sPose = FigureRig.sample(state, _rigT - _sg * 1.7, { phase: _phase });
          if (!_sPose) break;
          var _sj = FigureRig.solve(_sPose, x, y, 1, facing);
          c.globalAlpha = _a * 0.30 / _sg;
          c.strokeStyle = color;
          c.lineWidth = 4.0 - _sg * 0.6;
          c.beginPath();
          c.moveTo(_sj.shoulder.x, _sj.shoulder.y);
          c.lineTo(_sj.elbowF.x, _sj.elbowF.y);
          c.lineTo(_sj.handF.x, _sj.handF.y);
          c.stroke();
          if (isRun) {
            c.beginPath();
            c.moveTo(_sj.hip.x, _sj.hip.y);
            c.lineTo(_sj.kneeF.x, _sj.kneeF.y);
            c.lineTo(_sj.footF.x, _sj.footF.y);
            c.stroke();
          }
        }
        c.restore();
      }
      _smearAmt = 0;
    }

    if (_smearAmt > 0.05 && !_reflPass) {
      c.save(); c.shadowBlur = 0;
      for (var _sm = 1; _sm <= 2; _sm++) {
        var _sd = _sm * (isAttack ? 0.16 : 0.42);
        c.globalAlpha = _a * _smearAmt * (0.26 / _sm);
        c.lineWidth = 4.2 - _sm * 0.7;
        var _sa = laAng + Math.PI - _sd * facing;
        c.beginPath(); c.moveTo(x, aBase);
        c.lineTo(x + Math.cos(_sa)*armLen, aBase + Math.sin(_sa)*armLen); c.stroke();
      }
      c.restore();
    }

    if (_rig) {
      // Rig path: back arm first (darker) so the front arm reads in front of the torso.
      var _bo = -facing * 2.2;
      c.save();
      c.strokeStyle = _backCol; c.shadowBlur = 0;
      _bone({x:_rig.shoulder.x+_bo, y:_rig.shoulder.y+1},
            {x:_rig.elbowB.x+_bo,   y:_rig.elbowB.y+1},
            {x:_rig.handB.x+_bo,    y:_rig.handB.y+1}, 4.2, 3.1);
      c.restore();
      _bone(_rig.shoulder, _rig.elbowF, _rig.handF, 4.9, 3.6);
    } else {
      _limb(laAng + Math.PI, x);
      _limb(raAng, x);
    }

    var legLen  = isKneel ? 22 : (isCrouch ? 20 : 30);

    if (_rig) {
      // Rig path: back leg first, darker, same reasoning as the arms.
      var _lo = -facing * 2.0;
      c.save();
      c.strokeStyle = _backCol; c.shadowBlur = 0;
      _bone({x:_rig.hip.x+_lo,   y:_rig.hip.y},
            {x:_rig.kneeB.x+_lo, y:_rig.kneeB.y},
            {x:_rig.footB.x+_lo, y:_rig.footB.y}, 4.4, 3.3);
      c.lineWidth = 2.8;
      c.beginPath(); c.moveTo(_rig.footB.x+_lo, _rig.footB.y);
      c.lineTo(_rig.footB.x+_lo + facing * 6, _rig.footB.y + 1.5); c.stroke();
      c.restore();
      _bone(_rig.hip, _rig.kneeF, _rig.footF, 5.0, 3.6);
      // Feet are a short bone along facing. Without them legs end in points and the figure reads as floating.
      c.lineWidth = 3.0;
      c.beginPath(); c.moveTo(_rig.footF.x, _rig.footF.y);
      c.lineTo(_rig.footF.x + facing * 6, _rig.footF.y + 1.5); c.stroke();
      c.lineWidth = 4.5;
    } else if (isKneel) {
      // One knee down
      c.beginPath(); c.moveTo(hipX,hipY); c.lineTo(hipX-12,hipY+legLen); c.lineTo(hipX+4,hipY+legLen); c.stroke();
      c.beginPath(); c.moveTo(hipX,hipY); c.lineTo(hipX+16,hipY+14); c.lineTo(hipX+20,hipY+legLen); c.stroke();
    } else if (isWalk || isRun) {
      // Articulated gait: thigh swings, knee bends through recovery, extends at contact
      var gaitPhase = t * (isRun ? 0.28 : 0.20);
      var gaitAmp   = isRun ? 0.85 : 0.50;
      _drawGaitLeg(c, hipX, hipY, gaitPhase,           facing, legLen, gaitAmp);
      _drawGaitLeg(c, hipX, hipY, gaitPhase + Math.PI, facing, legLen, gaitAmp);
    } else {
      var legSwing = isHit  ? Math.sin(t*0.15)*8 :
                     isFall ? 10 * facing        :
                     Math.sin(t*0.038)*2.5;
      // Standing weight goes on the leg the sway is over, so a standing figure has a supporting side.
      for (var _lg = 0; _lg < 2; _lg++) {
        var _sgn = _lg ? 1 : -1;
        var _kx  = hipX + _sgn * 9 + legSwing * -_sgn;
        var _ky  = hipY + legLen * 0.5;
        var _fx  = hipX + _sgn * 11 + legSwing * -_sgn;
        var _fy  = hipY + legLen;
        c.lineWidth = 5.0;
        c.beginPath(); c.moveTo(hipX, hipY); c.lineTo(_kx, _ky); c.stroke();
        c.lineWidth = 3.6;
        c.beginPath(); c.moveTo(_kx, _ky); c.lineTo(_fx, _fy); c.stroke();
        c.lineWidth = 3.0;
        c.beginPath(); c.moveTo(_fx, _fy); c.lineTo(_fx + facing * 6, _fy + 1); c.stroke();
      }
      c.lineWidth = 4.5;
    }
    c.restore();
  }

  // One leg of a walking/running gait, drawn hip → knee → foot.
  function _drawGaitLeg(c, hx, hy, phase, facing, legLen, amp) {
    var thigh = legLen * 0.55, shin = legLen * 0.58;
    var sw = Math.sin(phase);
    var thighAng = Math.PI * 0.5 - sw * amp * facing;
    var kx = hx + Math.cos(thighAng) * thigh;
    var ky = hy + Math.sin(thighAng) * thigh;
    // Knee bends hardest in recovery and extends at contact.
    var bendK = Math.max(0, Math.cos(phase) * facing);
    var bend  = (0.12 + bendK * 0.95) * amp * 1.35;
    // The shin lags the thigh. Without that, the gait reads as scissors.
    var shinAng = thighAng + bend * facing + Math.sin(phase - 0.55) * 0.10 * facing;
    var fx = kx + Math.cos(shinAng) * shin, fy = ky + Math.sin(shinAng) * shin;
    // Thigh heavier than shin, same taper as the arms.
    var _lw = c.lineWidth;
    c.lineWidth = 5.0;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = 3.6;
    c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    // Foot rolls flat at contact and points through the swing. That is what makes a walk read as weight.
    var plant = Math.max(0, -Math.cos(phase) * facing);
    c.lineWidth = 3.0;
    c.beginPath(); c.moveTo(fx, fy);
    c.lineTo(fx + facing * (3 + plant * 5), fy + (1 - plant) * -2.5 + plant * 1.5);
    c.stroke();
    c.lineWidth = _lw;
  }

  function _drawBubble(c, anchorX, anchorY, text, color, typedLen, maxW, tailSide) {
    var shown=text.slice(0,typedLen); var pad=17,fSize=15,lineH=23;
    c.font=fSize+'px \'Segoe UI\', Arial, sans-serif';
    var words=shown.split(' '),wrLines=[],cur='';
    for (var wi=0;wi<words.length;wi++) { var test=cur?cur+' '+words[wi]:words[wi]; if(c.measureText(test).width>maxW-pad*2){if(cur)wrLines.push(cur);cur=words[wi];}else{cur=test;} }
    if(cur)wrLines.push(cur); if(!wrLines.length)return;
    var bw=maxW,bh=Math.max(52,wrLines.length*lineH+pad*2);
    var bx=tailSide==='left'?anchorX-30:anchorX-bw+30;
    var by=anchorY-bh-28;
    var cw=c.canvas.width; if(bx<8)bx=8; if(bx+bw>cw-8)bx=cw-8-bw;
    var tailX=anchorX,tailTip=by+bh+12;
    c.save(); c.shadowColor=color; c.shadowBlur=14;
    var r=10; c.fillStyle='rgba(4,2,18,0.93)'; c.strokeStyle=color; c.lineWidth=2;
    c.beginPath(); c.moveTo(bx+r,by); c.lineTo(bx+bw-r,by); c.quadraticCurveTo(bx+bw,by,bx+bw,by+r); c.lineTo(bx+bw,by+bh-r); c.quadraticCurveTo(bx+bw,by+bh,bx+bw-r,by+bh);
    var tl=Math.max(bx+r,Math.min(bx+bw-r,tailX)-9),tr=Math.max(bx+r,Math.min(bx+bw-r,tailX)+9);
    c.lineTo(tr,by+bh); c.lineTo(tailX,tailTip); c.lineTo(tl,by+bh); c.lineTo(bx+r,by+bh); c.quadraticCurveTo(bx,by+bh,bx,by+bh-r); c.lineTo(bx,by+r); c.quadraticCurveTo(bx,by,bx+r,by); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.fillStyle='#ffffff'; c.font=fSize+'px \'Segoe UI\', Arial, sans-serif';
    for (var li=0;li<wrLines.length;li++) { c.fillText(wrLines[li],bx+pad,by+pad+fSize+li*lineH); }
  }

  // Per-act visual identity, merged into every scene. Chapter-to-act mapping is by explicit id ranges. Keep in sync when adding chapters; unmapped ids warn once.
  var STORY_ACT_IDS = {
    act0:   [[0, 12]],
    act1:   [[13, 27]],
    act2:   [[28, 44]],
    act3:   [[45, 61]],
    side:   [[62, 62]],
    act5:   [[63, 68], [131, 136]],
    act6:   [[69, 77]],
    act4mv: [[78, 113]],
    act4:   [[114, 130]],
    act7:   [[140, 155]],
  };
  // grade: full-screen wash. letterbox: default bar fraction. captionTint: narrator bar colour. motif: ambient signature.
  var STORY_ACT_STYLES = {
    act0:   { grade: 'rgba(255,180,90,0.07)',  letterbox: 0.06,  captionTint: 'rgba(30,18,4,0.74)',  motif: 'dust',     motifColor: '#ffd9a0' },
    act1:   { grade: 'rgba(0,200,220,0.06)',   letterbox: 0.085, captionTint: 'rgba(2,22,28,0.74)',  motif: 'shards',   motifColor: '#55ddee' },
    act2:   { grade: 'rgba(170,200,255,0.06)', letterbox: 0.085, captionTint: 'rgba(10,16,30,0.74)', motif: 'grid',     motifColor: '#aaccff' },
    act3:   { grade: 'rgba(255,60,30,0.055)',  letterbox: 0.10,  captionTint: 'rgba(26,8,4,0.76)',   motif: 'embers',   motifColor: '#ff7733' },
    act4:   { grade: 'rgba(150,90,255,0.06)',  letterbox: 0.085, captionTint: 'rgba(16,8,30,0.74)',  motif: 'skybleed', motifColor: '#9966ff' },
    act4mv: { grade: 'rgba(150,90,255,0.06)',  letterbox: 0.085, captionTint: 'rgba(16,8,30,0.74)',  motif: 'skybleed', motifColor: '#bb66ff' },
    act5:   { grade: 'rgba(120,0,200,0.08)',   letterbox: 0.11,  captionTint: 'rgba(14,0,24,0.78)',  motif: 'tears',    motifColor: '#bb44ff' },
    act6:   { grade: 'rgba(255,200,80,0.07)',  letterbox: 0.11,  captionTint: 'rgba(24,16,0,0.78)',  motif: 'panels',   motifColor: '#ffcc55' },
    act7:   { grade: 'rgba(240,240,255,0.05)', letterbox: 0.12,  captionTint: 'rgba(8,8,14,0.80)',   motif: 'rings',    motifColor: '#ffffff' },
    side:   { grade: 'rgba(170,200,255,0.06)', letterbox: 0.085, captionTint: 'rgba(10,16,30,0.74)', motif: 'grid',     motifColor: '#aaccff' },
  };
  var _actWarned = {};
  function _getActStyle(chId) {
    if (chId === undefined || chId === null) return null;
    for (var act in STORY_ACT_IDS) {
      var runs = STORY_ACT_IDS[act];
      for (var ri = 0; ri < runs.length; ri++) {
        if (chId >= runs[ri][0] && chId <= runs[ri][1]) return STORY_ACT_STYLES[act] || null;
      }
    }
    if (!_actWarned[chId]) { _actWarned[chId] = true; console.warn('[StoryScene] chapter', chId, 'has no act mapping in STORY_ACT_IDS'); }
    return null;
  }

  // Deterministic per-index pseudo-random (no state, so motifs replay identically)
  function _mHash(i) { var r = Math.sin(i * 127.1 + 311.7) * 43758.5453; return r - Math.floor(r); }

  // Ambient act-signature motif, drawn inside the camera transform over the bg.
  function _drawActMotif(c, w, h, t, footY) {
    if (!_actStyle || !_actStyle.motif) return;
    var col = _actStyle.motifColor || '#ffffff';
    c.save();
    switch (_actStyle.motif) {
      case 'dust':
        c.fillStyle = col;
        for (var i = 0; i < 18; i++) {
          var r = _mHash(i);
          var x = ((r * w) + Math.sin(t * 0.006 + i) * 30 + t * (0.08 + r * 0.12)) % w;
          var y = (_mHash(i + 50) * h * 0.8) + Math.sin(t * 0.01 + i * 2) * 8;
          c.globalAlpha = 0.10 + 0.10 * Math.sin(t * 0.02 + i * 1.7);
          c.beginPath(); c.arc(x, y, 1.1 + r * 1.3, 0, Math.PI * 2); c.fill();
        }
        break;
      case 'shards':
        c.strokeStyle = col; c.lineWidth = 1;
        for (var i2 = 0; i2 < 10; i2++) {
          var r2 = _mHash(i2);
          var x2 = r2 * w;
          var y2 = h - (((t * (0.15 + r2 * 0.2)) + _mHash(i2 + 9) * h) % (h * 1.1));
          var sz = 4 + r2 * 7, a2 = t * 0.004 * (r2 > 0.5 ? 1 : -1) + i2;
          c.globalAlpha = 0.14 + r2 * 0.12;
          c.save(); c.translate(x2, y2); c.rotate(a2);
          c.beginPath(); c.moveTo(0, -sz); c.lineTo(sz * 0.8, sz * 0.6); c.lineTo(-sz * 0.7, sz * 0.5); c.closePath(); c.stroke();
          c.restore();
        }
        break;
      case 'grid':
        c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = 0.05;
        var gOff = (t * 0.12) % 64;
        for (var gx = -64 + gOff; gx < w + 64; gx += 64) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx - 30, h); c.stroke(); }
        for (var gy = 32 + (t * 0.05) % 64; gy < h; gy += 64) { c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy); c.stroke(); }
        break;
      case 'embers':
        c.fillStyle = col;
        for (var i3 = 0; i3 < 16; i3++) {
          var r3 = _mHash(i3);
          var x3 = (r3 * w + Math.sin(t * 0.015 + i3 * 3) * 22) % w;
          var y3 = h - (((t * (0.35 + r3 * 0.5)) + _mHash(i3 + 30) * h) % (h + 20));
          c.globalAlpha = (0.12 + 0.16 * Math.abs(Math.sin(t * 0.05 + i3 * 2.3))) * (y3 / h);
          c.beginPath(); c.arc(x3, y3, 1 + r3 * 1.6, 0, Math.PI * 2); c.fill();
        }
        break;
      case 'skybleed': {
        var sbGrad = c.createLinearGradient(0, 0, 0, h * 0.5);
        var sbA = 0.10 + 0.05 * Math.sin(t * 0.012);
        c.globalAlpha = sbA;
        sbGrad.addColorStop(0, col); sbGrad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = sbGrad; c.fillRect(0, 0, w, h * 0.5);
        break;
      }
      case 'tears':
        c.strokeStyle = col; c.lineWidth = 1.6;
        for (var i4 = 0; i4 < 3; i4++) {
          var cyc = (t + i4 * 217) % 260;
          if (cyc > 26) continue;
          var r4 = _mHash(i4 + Math.floor((t + i4 * 217) / 260));
          var x4 = r4 * w, y4 = _mHash(i4 + 70) * h * 0.5 + h * 0.1;
          c.globalAlpha = 0.5 * (1 - cyc / 26) * (0.6 + 0.4 * Math.sin(t * 1.3));
          c.beginPath(); c.moveTo(x4, y4);
          c.lineTo(x4 + 4, y4 + 18); c.lineTo(x4 - 3, y4 + 34); c.lineTo(x4 + 2, y4 + 52);
          c.stroke();
        }
        break;
      case 'panels':
        c.strokeStyle = col; c.lineWidth = 1;
        for (var i5 = 0; i5 < 6; i5++) {
          var r5 = _mHash(i5);
          var x5 = r5 * w, y5 = _mHash(i5 + 20) * h * 0.55 + Math.sin(t * 0.008 + i5 * 2) * 10;
          var pw = 18 + r5 * 26, ph = 10 + _mHash(i5 + 40) * 14;
          c.globalAlpha = 0.12 + r5 * 0.10;
          c.strokeRect(x5 - pw / 2, y5 - ph / 2, pw, ph);
        }
        break;
      case 'rings':
        c.strokeStyle = col; c.lineWidth = 1.4;
        for (var i6 = 0; i6 < 2; i6++) {
          var rp = ((t + i6 * 45) % 90) / 90;
          c.globalAlpha = 0.16 * (1 - rp);
          c.beginPath(); c.arc(w * 0.5, h * 0.32, 12 + rp * Math.min(w, h) * 0.42, 0, Math.PI * 2); c.stroke();
        }
        break;
    }
    c.restore();
  }

  // Splits an rgba()/rgb() tint so the scrim can fade the same colour to transparent.
  function _tintParts(css) {
    var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(css || '');
    if (!m) return { r: 0, g: 0, b: 0, a: 0.72 };
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  }

  function _drawCaption(c, w, h, text, typedLen) {
    var shown = text.slice(0, typedLen);
    // Scales with the viewport. A fixed 16px was tiny on large screens.
    var fSize = Math.max(16, Math.round(h * 0.0225));
    var lineH = Math.round(fSize * 1.55);
    var pad   = Math.round(fSize * 1.4);
    // Shorter measure than before. Long lines made it look like a subtitle track.
    var maxW  = Math.min(w * 0.66, 980);

    c.save();
    c.font = 'italic ' + fSize + 'px \'Segoe UI\', Georgia, serif';
    var words = shown.split(' '), wrLines = [], cur = '';
    for (var wi = 0; wi < words.length; wi++) {
      var test = cur ? cur + ' ' + words[wi] : words[wi];
      if (c.measureText(test).width > maxW) { if (cur) wrLines.push(cur); cur = words[wi]; }
      else cur = test;
    }
    if (cur) wrLines.push(cur);

    var totalH = wrLines.length * lineH + pad * 2;
    // Cinematic mode puts the caption above the lower letterbox. The standard reader keeps it where the Next button can own the bottom.
    var by;
    if (_cinMode) {
      var _bsL  = _getBeatSpec();
      var _lbF  = (_bsL && _bsL.letterbox !== undefined) ? _bsL.letterbox : (_actStyle && _actStyle.letterbox);
      var _lbPx = _lbF ? (typeof _lbF === 'number' ? _lbF : 0.085) * h : 0;
      by = h - _lbPx - totalH - Math.round(h * 0.045);
    } else {
      by = h * FOOT_YF - totalH - 12;
    }
    var _capA  = Math.min(1, _beatT / 12);

    // Scrim: vertical gradient of the act tint, fading out above the text so the type sits in shadow, not a box.
    var tp   = _tintParts((_actStyle && _actStyle.captionTint) || 'rgba(0,0,0,0.72)');
    var top  = by - fSize * 2.6;
    var bot  = Math.min(h, by + totalH + fSize * 2.2);
    var grd  = c.createLinearGradient(0, top, 0, bot);
    var rgb  = tp.r + ',' + tp.g + ',' + tp.b;
    // The reader keeps a near-solid core to mask the figure behind the text. Both fade at the edges.
    var _core = _cinMode ? 0.82 : 1.0;
    grd.addColorStop(0,    'rgba(' + rgb + ',0)');
    grd.addColorStop(0.30, 'rgba(' + rgb + ',' + (tp.a * 0.78 * _core).toFixed(3) + ')');
    grd.addColorStop(0.72, 'rgba(' + rgb + ',' + (tp.a * _core).toFixed(3) + ')');
    grd.addColorStop(1,    'rgba(' + rgb + ',0)');
    c.globalAlpha = _capA;
    c.fillStyle = grd;
    c.fillRect(0, top, w, bot - top);

    // Act-coloured hairline rule, now with a soft falloff at both ends.
    var ruleG = c.createLinearGradient(w * 0.5 - 90, 0, w * 0.5 + 90, 0);
    var rc = (_actStyle && _actStyle.motifColor) || '#8899bb';
    ruleG.addColorStop(0, 'rgba(0,0,0,0)');
    ruleG.addColorStop(0.5, rc);
    ruleG.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = _capA * 0.5;
    c.fillStyle = ruleG;
    c.fillRect(w * 0.5 - 90, by - 2, 180, 1.2);

    if ('letterSpacing' in c) c.letterSpacing = '0.6px';
    c.globalAlpha = _capA;
    c.textAlign = 'center';
    c.shadowColor = 'rgba(0,0,0,0.85)';
    c.shadowBlur  = Math.round(fSize * 0.55);
    c.shadowOffsetY = 1;
    c.fillStyle = '#e6ecff';
    for (var li = 0; li < wrLines.length; li++) {
      c.fillText(wrLines[li], w * 0.5, by + pad + fSize + li * lineH);
    }
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.textAlign = 'left';
    c.restore();
  }

  function _drawBtn(c, w, h, label) {
    var bw=170,bh=44,bx=(w-bw)*0.5,by=h*0.90;
    c.save(); c.fillStyle='rgba(255,200,100,0.11)'; c.strokeStyle='rgba(255,200,100,0.44)'; c.lineWidth=1.5;
    _rrect(c,bx,by,bw,bh,9); c.fill(); c.stroke();
    c.fillStyle='#ffcc88'; c.font='15px \'Segoe UI\', Arial, sans-serif'; c.textAlign='center';
    c.fillText(label,w*0.5,by+28); c.textAlign='left'; c.restore();
  }

  // Kael's presence: the space around him grows with his power, 0..1 from the chapter id (none before id 13, 0.92+ for the Absolute form).
  // A beat's power: override turns it off at 0.
  function _kaelPower(bs) {
    if (bs && typeof bs.power === 'number') return _clamp(bs.power, 0, 1);
    if (_spec && typeof _spec.power === 'number') return _clamp(_spec.power, 0, 1);
    var id = _chapter && _chapter.id;
    if (typeof id !== 'number' || id < 13) return 0;
    var p = 0.12 + 0.88 * Math.pow(_clamp((id - 13) / 172, 0, 1), 0.85);
    return id >= 152 ? Math.max(p, 0.92) : p;
  }
  var _PRES_STATE = { kneel: 0.45, crouch: 0.5, hit: 0.45, fall: 0.5, stance: 1.15, attack: 1.2, brace: 1.1, run: 1.05 };
  var _presK = 0.8;
  function _drawKaelPresence(c, x, gy, by, t, P, state, alpha, s) {
    _presK += ((_PRES_STATE[state] || 0.8) - _presK) * 0.05;
    var K = _presK * alpha;
    if (K <= 0.01) return;
    function sm(a, b) { var u = _clamp((P - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
    function fr(v) { return v - Math.floor(v); }
    var R = (85 + 215 * P) * s;
    var cr = Math.round(80 + 120 * sm(0.5, 1)), cg = Math.round(150 + 75 * sm(0.5, 1));
    var col = function (a) { return 'rgba(' + cr + ',' + cg + ',255,' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; };
    var i, u, h1, h2, h3;
    c.save();

    var debris = sm(0.28, 0.5), cracks = sm(0.42, 0.65), ripple = sm(0.58, 0.8), far = sm(0.78, 0.98);

    // Streaks falling toward him, the frame leaning in.
    if (far > 0) {
      c.globalCompositeOperation = 'lighter';
      c.lineCap = 'round';
      for (i = 0; i < 34; i++) {
        h1 = _mHash(i + 500); h2 = _mHash(i + 540); h3 = _mHash(i + 580);
        u = fr(t * (0.0016 + 0.0016 * h2) + h3);
        var ang = h1 * Math.PI * 2, r1 = R * (3.6 - 2.0 * u), len = (50 + 110 * h2) * s;
        c.strokeStyle = col(Math.sin(Math.PI * u) * 0.34 * K * far);
        c.lineWidth = 1.4 * s;
        c.beginPath();
        c.moveTo(x + Math.cos(ang) * r1, by + Math.sin(ang) * r1 * 0.7);
        c.lineTo(x + Math.cos(ang) * (r1 - len), by + Math.sin(ang) * (r1 - len) * 0.7);
        c.stroke();
      }
    }

    // Ripples in the air around his body.
    if (ripple > 0) {
      c.globalCompositeOperation = 'lighter';
      for (i = 0; i < 3; i++) {
        u = fr(t * 0.0035 + i / 3);
        var rr = R * (0.35 + 1.25 * u);
        c.strokeStyle = col((1 - u) * 0.20 * K * ripple);
        c.lineWidth = (1 + 1.5 * (1 - u)) * s;
        c.beginPath(); c.ellipse(x, by, rr, rr * 0.92, 0, 0, Math.PI * 2); c.stroke();
      }
    }

    // Pool of light on the floor.
    c.globalCompositeOperation = 'lighter';
    c.save();
    c.translate(x, gy + 5 * s); c.scale(1, 0.20);
    var pg = c.createRadialGradient(0, 0, 0, 0, 0, R);
    pg.addColorStop(0,   col(0.34 * K * (0.75 + 0.25 * P)));
    pg.addColorStop(0.5, col(0.11 * K * (0.75 + 0.25 * P)));
    pg.addColorStop(1,   col(0));
    c.fillStyle = pg; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.restore();

    // The floor gives: glowing hairline cracks running out from under him.
    if (cracks > 0) {
      c.lineWidth = 1.3 * s; c.lineJoin = 'round';
      c.strokeStyle = col(0.55 * K * cracks);
      for (i = 0; i < 8; i++) {
        h1 = _mHash(i + 300); h2 = _mHash(i + 340);
        var dir = i % 2 ? 1 : -1, L = R * (0.45 + 0.75 * h1) * cracks;
        var px = x + dir * 6 * s, py = gy + (4 + 9 * h2) * s;
        c.beginPath(); c.moveTo(px, py);
        for (var k = 1; k <= 5; k++) {
          px += dir * L / 5;
          py += (_mHash(i * 7 + k + 360) - 0.5) * 5 * s;
          c.lineTo(px, py);
        }
        c.stroke();
      }
    }

    // Dust lifting off the ground.
    var n = Math.floor(10 + 40 * P);
    for (i = 0; i < n; i++) {
      h1 = _mHash(i + 100); h2 = _mHash(i + 140); h3 = _mHash(i + 180);
      u = fr(t * (0.004 + 0.006 * h2) + h3);
      c.fillStyle = col(Math.sin(Math.PI * u) * 0.75 * K);
      var ms = (0.8 + 1.6 * h3) * s;
      c.fillRect(x + (h1 - 0.5) * 1.8 * R - ms / 2, gy - u * (40 + 220 * P) * s, ms, ms);
    }

    // Loose debris hanging in the air, each piece with its shadow left on the floor.
    if (debris > 0) {
      c.globalCompositeOperation = 'source-over';
      var dn = Math.floor(3 + 9 * P);
      for (i = 0; i < dn; i++) {
        h1 = _mHash(i + 200); h2 = _mHash(i + 240); h3 = _mHash(i + 280);
        var dx = x + (i % 2 ? 1 : -1) * (0.22 + 0.72 * h1) * R;
        var hov = ((10 + 70 * P * h2) * debris + Math.sin(t * 0.021 + i * 1.9) * 3) * s;
        var ds = (2.2 + 3.4 * h3) * s, rot = h3 * 6.28 + t * 0.004 * (h2 - 0.5);
        c.fillStyle = 'rgba(0,0,0,' + (0.22 * K * debris).toFixed(3) + ')';
        c.beginPath(); c.ellipse(dx, gy + 6 * s, ds * 1.3, ds * 0.35, 0, 0, Math.PI * 2); c.fill();
        c.beginPath();
        for (var v = 0; v < 4; v++) {
          var va = rot + v * Math.PI / 2, vr = ds * (0.7 + 0.6 * _mHash(i * 5 + v + 420));
          if (v === 0) c.moveTo(dx + Math.cos(va) * vr, gy - hov + Math.sin(va) * vr);
          else c.lineTo(dx + Math.cos(va) * vr, gy - hov + Math.sin(va) * vr);
        }
        c.closePath();
        c.fillStyle = 'rgba(10,14,22,' + (0.9 * K * debris).toFixed(3) + ')'; c.fill();
        c.strokeStyle = col(0.5 * K * debris); c.lineWidth = 0.9 * s; c.stroke();
      }
    }
    c.restore();
  }

  function _getBeatSpec() {
    if (!_spec || !_spec.beats) return null;
    var _bi = _beatIdx + ((_chapter && _chapter._sceneBeatOffset) || 0);
    return _spec.beats[_bi] || _spec.beats[_spec.beats.length-1] || null;
  }

  var _FX_AMBIENT = { speedlines:1, static_noise:1, fragment_pulse:1, portal:1, multi_portals:1, sky_bleed:1,
                      fire_glow:1, smoke:1, echo_text:1, phone:1, objective_marker:1 };
  function _drawBeatEffects(effects, c, w, h, footY, t, bt, pX, nX) {
    for (var i = 0; i < effects.length; i++) {
      var ef = effects[i];
      var sf = ef.startFrame || 0;
      if (bt < sf) continue;
      var localT = t - sf;
      var dur    = ef.duration || ef.dur || 30;
      var raw    = ef.alpha !== undefined ? ef.alpha : 1;
      var alpha  = raw;
      if (ef.fadeIn) alpha *= Math.min(1, (bt-sf)/ef.fadeIn);
      // Ambient effects run to the end of the beat unless given a duration.
      if (ef.duration && _FX_AMBIENT[ef.type]) {
        if (bt > sf + ef.duration) continue;
        alpha *= Math.min(1, (sf + ef.duration - bt) / 10);
      }

      switch (ef.type) {
        case 'portal':
          _drawPortal(c, (ef.xf!==undefined?ef.xf:ef.cx||0.5)*w, (ef.yf!==undefined?ef.yf:ef.cy||0.5)*h, (ef.height||0.45)*h, ef.color||'#aa44ff', alpha, localT);
          break;
        case 'multi_portals': {
          // Support both `portals: [...]` and a bare `count: N`. Only the array was ever implemented.
          var _mp = ef.portals;
          if (!_mp && ef.count > 0) {
            _mp = [];
            for (var mi = 0; mi < ef.count; mi++) {
              _mp.push({ xf: (mi + 1) / (ef.count + 1),
                         yf: 0.42 + Math.sin(mi * 1.7) * 0.06,
                         height: 0.34 + (mi % 3) * 0.05,
                         color: ef.color, a: 1 });
            }
          }
          if (!_mp || !_mp.length) break;
          for (var pi=0;pi<_mp.length;pi++) { var p=_mp[pi]; _drawPortal(c,p.xf*w,p.yf*h,(p.height||0.45)*h,p.color||ef.color||'#aa44ff',alpha*(p.a||1),localT+pi*13); }
          break;
        }
        case 'sky_cracks':
          _drawSkyCracks(c,w,h,ef.progress!==undefined?ef.progress:Math.min(1,(bt-sf)/(ef.spreadFrames||60)),localT);
          break;
        case 'fire_glow':
          _drawFireGlow(c,w,h,alpha*(ef.intensity||1),localT);
          break;
        case 'phone':
          _drawPhone(c,ef.xf!==undefined?ef.xf*w:pX+22,ef.yf!==undefined?ef.yf*h:footY-40,alpha,localT);
          break;
        case 'fragment_pulse':
          _drawFragmentPulse(c,pX,footY,ef.color||'#4488ff',localT);
          break;
        case 'door':
          _drawDoor(c,ef.xf*w,ef.yf*h,(ef.w2||0.09)*w,(ef.h2||0.40)*h,ef.crack||0,localT);
          break;
        case 'door_opening':
          _drawDoor(c,ef.xf*w,ef.yf*h,(ef.w2||0.09)*w,(ef.h2||0.40)*h,Math.min(1,(bt-sf)/(ef.openFrames||40)),localT);
          break;
        case 'cache_items':
          _drawCacheItems(c,w,h,alpha,localT);
          break;
        case 'static_noise':
          _drawStaticNoise(c,w,h,alpha*0.35);
          break;
        case 'smoke':
          _drawSmoke(c,w,h,localT,alpha);
          break;
        case 'sky_bleed':
          _drawSkyBleed(c,w,h,alpha,localT);
          break;
        case 'objective_marker':
          _drawObjectiveMarker(c,ef.xf*w,ef.yf*h,ef.color,alpha,localT);
          break;
        case 'echo_text':
          _drawEchoText(c,ef.text||'...',ef.color,alpha,w,h,localT);
          break;
        case 'portal_enter': {
          var ep=Math.min(1,(bt-sf)/(ef.duration||30));
          _drawFigure(c,ef.fromX*w+(nX-ef.fromX*w)*ep,footY,ef.color||'#88aacc',-1,ep>0.7?'idle':'walk',localT,ep,_figScale());
          break;
        }
        case 'speedlines':
          _drawSpeedLines(c,ef.cx!==undefined?ef.cx*w:w*0.5,ef.cy!==undefined?ef.cy*h:h*0.5,ef.count||20,ef.color||'#ffffff',alpha,localT);
          break;
        case 'shockwave': {
          var sp=_clamp((bt-sf)/dur,0,1);
          if(sp>0&&sp<1) _drawShockwave(c,ef.cx*w,ef.cy*h,sp,ef.color||'#ffffff',(raw)*(1-sp*0.7));
          break;
        }
        case 'impact_sparks': {
          var isp=_clamp((bt-sf)/dur,0,1);
          if(isp>=0&&isp<=1) _drawImpactSparks(c,ef.cx*w,ef.cy*h,ef.count||12,ef.color||'#ffff00',isp,localT);
          break;
        }
        case 'energy_burst': {
          var ebp=_clamp((bt-sf)/dur,0,1);
          if(ebp>=0&&ebp<=1) _drawEnergyBurst(c,ef.cx*w,ef.cy*h,ebp,ef.color||'#ffaa00',alpha*(1-ebp));
          break;
        }
        case 'ground_crack':
          _drawGroundCrack(c,ef.cx*w,footY,_clamp((bt-sf)/dur,0,1),ef.color);
          break;
        case 'motion_blur':
          _drawMotionBlur(c,ef.fromX*w,footY,ef.toX*w,footY,ef.color||'#4488ff',alpha,ef.steps||4);
          break;
      }
    }
  }

  function _render() {
    if (!_canvas) return;
    _t++; _beatT++;
    if (_trans) { _trans.t++; if (_trans.t > _trans.dur) _trans = null; }

    var w = _canvas.width, h = _canvas.height;
    var beat = _beats[_beatIdx];
    var bs   = _getBeatSpec();
    var footY = h * FOOT_YF;

    // Update camera + overlays
    _camUpdate(bs, _beatT);

    _ctx.clearRect(0,0,w,h);

    // Whip-pan transition: scene slides in horizontally with an ease-out snap
    var _twActive = _trans && _trans.type === 'whip';
    var _twP = 0;
    if (_twActive) {
      _twP = 1 - Math.pow(_trans.t / _trans.dur, 2);
      _ctx.save(); _ctx.translate(_twP * w * 0.30, 0);
    }

    _camBegin(_ctx, w, h);

    var theme = (bs && bs.bg) ? bs.bg : (_spec && _spec.bg) ? _spec.bg : _getTheme(_chapter);
    // A chapter with an authored map plays in that map, unless a beat names another level.
    var _lvScene = (typeof storyLevelSceneSpec === 'function') ? storyLevelSceneSpec(_chapter) : null;
    if (_lvScene && !(bs && bs.bg) && theme !== 'level') { theme = 'level'; if (!(_spec && _spec.level)) bs = Object.assign({}, bs || {}, { level: _lvScene }); }
    var _lvSpec = (bs && bs.level) || (_spec && _spec.level);
    if (_lvSpec) _lvSpec.t = _beatT;
    if (bs && bs.warp) { _ctx.save(); var wave=Math.sin(_t*0.04)*bs.warp; _ctx.transform(1,wave*0.01,wave*0.008,1,0,0); }
    switch(theme) {
      case 'city':     _drawCityBg(_ctx,w,h,_t,bs&&bs.cityOpts); break;
      case 'level':    if (!(typeof drawStoryLevelScene === 'function' && drawStoryLevelScene(_ctx,w,h,footY,(bs&&bs.level)||(_spec&&_spec.level)))) _drawCityBg(_ctx,w,h,_t,bs&&bs.cityOpts); break;
      case 'forest':   _drawForestBg(_ctx,w,h,_t); break;
      case 'cave':     _drawCaveBg(_ctx,w,h,_t); break;
      case 'volcano':  _drawCityBg(_ctx,w,h,_t,{skyTop:'#200400',skyMid:'#300800',skyBot:'#200400',noMoon:true,farColor:'#2a0a04',hazeColor:'rgba(200,70,20,0.12)',winColor:'#ff9955',sheen:'rgba(255,120,40,0.10)'}); _drawFireGlow(_ctx,w,h,0.7,_t); break;
      default:         _drawFractureBg(_ctx,w,h,_t); break;
    }
    if (bs && bs.warp) _ctx.restore();

    // Act-signature ambient motif (style pack, over bg, under everything else)
    _drawActMotif(_ctx, w, h, _t, footY);

    if (!beat) { _camEnd(_ctx); if (_twActive) _ctx.restore(); _finish(); return; }

    // Effects behind figures
    if (bs && bs.effectsBehind) _drawBeatEffects(bs.effectsBehind,_ctx,w,h,footY,_t,_beatT,_pX(),_nX());

    // Extra background figures
    if (bs && bs.extraFigures) {
      for (var ei=0;ei<bs.extraFigures.length;ei++) {
        var ef=bs.extraFigures[ei];
        // `pos` takes playerPos keyframes, so a crowd can march in and break formation.
        var efa = ef.pos ? _getFigAnim(ef.pos, _beatT) : null;
        if (efa && efa.show === false) continue;
        _figKey='x'+ei;
        _drawFigure(_ctx,(efa&&efa.x!==undefined?efa.x:ef.xf)*w,footY+(efa?(efa.arcY||0)+(efa.y||0)*h:0),ef.color||'#887766',(efa&&efa.facing)||ef.facing||1,(efa&&efa.state)||ef.state||'idle',_t+ei*17,efa&&efa.alpha!==undefined?efa.alpha:(ef.alpha||0.55),((efa&&efa.scale)||ef.scale||1)*_figScale());
        _figKey=null;
      }
    }

    // Resolve figure configs (animated keyframes or static spec)
    var pCfg = _resolveFig('player', bs, beat);
    var nCfg = _resolveFig('npc',    bs, beat);

    // Ground reflections: figures mirrored below the foot line, squashed and faint
    var _fy2 = footY + 14;
    _reflPass = true;
    _ctx.save();
    _ctx.translate(0, _fy2); _ctx.scale(1, -0.32); _ctx.translate(0, -_fy2);
    if (pCfg.show) _drawFigure(_ctx, pCfg.x, footY, '#4488ff', pCfg.facing, pCfg.state, _t, pCfg.alpha*0.15, (pCfg.scale||1)*_figScale(), pCfg.expr);
    if (nCfg.show) _drawFigure(_ctx, nCfg.x, footY, nCfg.color, nCfg.facing, nCfg.state, _t, nCfg.alpha*0.15, (nCfg.scale||1)*_figScale(), nCfg.expr);
    _ctx.restore();
    _reflPass = false;

    var _kp = pCfg.show ? _kaelPower(bs) : 0;
    if (_kp > 0) _drawKaelPresence(_ctx, pCfg.x, footY, footY + (pCfg.arcY||0) - 46*_figScale(), _t, _kp, pCfg.state, pCfg.alpha, _figScale());
    _figKey = 'p';
    if (pCfg.show) _drawFigure(_ctx, pCfg.x, footY + (pCfg.arcY||0), '#4488ff', pCfg.facing, pCfg.state, _t, pCfg.alpha, (pCfg.scale||1)*_figScale(), pCfg.expr);
    _figKey = 'n';
    if (nCfg.show) _drawFigure(_ctx, nCfg.x, footY + (nCfg.arcY||0), nCfg.color, nCfg.facing, nCfg.state, _t, nCfg.alpha, (nCfg.scale||1)*_figScale(), nCfg.expr);
    _figKey = null;

    // Effects in front of figures
    if (bs && bs.effects) _drawBeatEffects(bs.effects,_ctx,w,h,footY,_t,_beatT,_pX(),_nX());

    _camEnd(_ctx);
    if (_twActive) {
      _ctx.restore();
      // Horizontal motion streaks while the whip-pan settles
      _ctx.save();
      _ctx.globalAlpha = _twP * 0.30; _ctx.strokeStyle = '#ffffff'; _ctx.lineWidth = 1.5;
      for (var _si = 0; _si < 7; _si++) {
        var _sy = _mHash(_si + 80) * h;
        _ctx.beginPath(); _ctx.moveTo(0, _sy); _ctx.lineTo(w * (0.4 + _mHash(_si) * 0.6) * _twP + 40, _sy); _ctx.stroke();
      }
      _ctx.restore();
    }

    // Act color grade: subtle full-screen wash unifying the act's look
    if (_actStyle && _actStyle.grade) {
      _ctx.save(); _ctx.fillStyle = _actStyle.grade; _ctx.fillRect(0, 0, w, h); _ctx.restore();
    }
    // Cinematic post pass: vignette + animated film grain
    _drawVignette(_ctx, w, h);
    if (_cinMode) {
      // A tighter second vignette and a low horizon bloom. Most of what makes it read as a shot, not a drawing.
      _ctx.save();
      var vg2 = _ctx.createRadialGradient(w*0.5, h*0.46, Math.min(w,h)*0.30,
                                          w*0.5, h*0.46, Math.max(w,h)*0.78);
      vg2.addColorStop(0, 'rgba(0,0,0,0)');
      vg2.addColorStop(1, 'rgba(0,0,0,0.42)');
      _ctx.fillStyle = vg2; _ctx.fillRect(0,0,w,h);
      var bloom = _ctx.createLinearGradient(0, h*FOOT_YF - h*0.16, 0, h*FOOT_YF + h*0.05);
      var bc = (_actStyle && _actStyle.motifColor) || '#8899bb';
      bloom.addColorStop(0, 'rgba(0,0,0,0)');
      bloom.addColorStop(1, bc);
      _ctx.globalAlpha = 0.055; _ctx.globalCompositeOperation = 'lighter';
      _ctx.fillStyle = bloom; _ctx.fillRect(0, h*FOOT_YF - h*0.16, w, h*0.21);
      _ctx.restore();
    }
    _drawGrain(_ctx, w, h, _t);
    // Letterbox (beat value wins; act style provides the default depth)
    var _lbRaw = (bs && bs.letterbox !== undefined) ? bs.letterbox : (_actStyle && _actStyle.letterbox);
    if (_lbRaw) {
      var lbh = (typeof _lbRaw === 'number' ? _lbRaw : 0.085) * h;
      // Bars slide in over the first ~0.4s, so the frame opens up instead of appearing.
      if (_cinMode) lbh *= _ease(_clamp(_t / 26, 0, 1));
      _ctx.fillStyle='#000000';
      _ctx.fillRect(0,0,w,lbh); _ctx.fillRect(0,h-lbh,w,lbh);
      // A hairline of light on the inner edge, so the bars don't read as the canvas ending.
      if (lbh > 1) {
        _ctx.save(); _ctx.globalAlpha = 0.10; _ctx.fillStyle = '#ffffff';
        _ctx.fillRect(0, lbh - 1, w, 1); _ctx.fillRect(0, h - lbh, w, 1);
        _ctx.restore();
      }
    }
    // Beat transition overlay: fade = from black, slam = white flash-cut
    if (_trans && (_trans.type === 'fade' || _trans.type === 'slam')) {
      var _tp = _trans.t / _trans.dur;
      _ctx.save();
      _ctx.globalAlpha = (1 - _tp) * (_trans.type === 'slam' ? 0.85 : 1);
      _ctx.fillStyle = _trans.type === 'slam' ? '#ffffff' : '#000000';
      _ctx.fillRect(0, 0, w, h);
      _ctx.restore();
    }
    // Screen flash (from effects list)
    var allEf = bs ? (bs.effectsBehind||[]).concat(bs.effects||[]) : [];
    for (var fi=0;fi<allEf.length;fi++) {
      var fef=allEf[fi];
      if (fef.type!=='screen_flash') continue;
      var fsf=fef.startFrame||0, fdur=fef.duration||10;
      var fp=_clamp((_beatT-fsf)/fdur,0,1);
      if (fp>0&&fp<=1) {
        _ctx.save(); _ctx.globalAlpha=(fef.alpha||0.92)*(1-fp); _ctx.fillStyle=fef.color||'#ffffff'; _ctx.fillRect(0,0,w,h); _ctx.restore();
      }
    }

    var totalText = beat.lines.join(' ');
    var now = performance.now();
    _ffUpdate();
    if (_typedLen < totalText.length) {
      var add = Math.floor((now - _lastTypeTime) / (TYPEWRITE_MS / (_ffHeld ? FF_RATE : 1)));
      if (add > 0) { _typedLen = Math.min(totalText.length, _typedLen+add); _lastTypeTime=now; }
    }

    var npcColor = (bs && bs.npcColor) ? bs.npcColor : (_spec && _spec.npcColor) ? _spec.npcColor : (_chapter && _chapter.opponentColor) || '#cc7733';
    var bMaxW = Math.min(280, w*0.36);
    var headYoff = footY - (72 + 13) * _figScale() - 26;
    var resolvedPX = _pX(), resolvedNX = _nX();
    // Bubbles are screen space, so the speaker's position goes through the camera first.
    function _camX(x) { return _clamp(_cam.cx * w + (x - _cam.cx * w) * _cam.zoom, 40, w - 40); }
    var _headTop = footY - (72 + 13) * _figScale();
    headYoff = Math.max(h * 0.30, _cam.cy * h + (_headTop - _cam.cy * h) * _cam.zoom - 26);

    if (beat.hasQuote) {
      if (beat.speaker === 'player') {
        _drawBubble(_ctx, _camX(resolvedPX), headYoff, totalText, '#4488ff', _typedLen, bMaxW, 'left');
      } else {
        var bubX = (bs && bs.bubbleX !== undefined) ? w*bs.bubbleX : resolvedNX;
        _drawBubble(_ctx, _camX(bubX), headYoff, totalText, npcColor, _typedLen, bMaxW, 'right');
      }
    } else {
      _drawCaption(_ctx, w, h, totalText, _typedLen);
    }

    // Chapter label
    _ctx.save(); _ctx.globalAlpha=0.65; _ctx.fillStyle='#8899bb'; _ctx.font='11px \'Segoe UI\', Arial, sans-serif';
    _ctx.fillText((_chapter&&_chapter.world)||'',18,26); _ctx.fillStyle='#ffcc88'; _ctx.font='bold 14px \'Segoe UI\', Arial, sans-serif';
    _ctx.fillText(_cinLabel || (_chapter&&_chapter.title) || '',18,44); _ctx.restore();

    var done = _typedLen >= totalText.length;

    if (_cinMode) {
      // Auto-advance once the line has finished and held. The hold is a reading-rate budget of ~CIN_CPS chars per second, with a floor and a cap.
      // A single-chapter cutscene holds on the last beat and shows the normal action button. A multi-chapter run passes that off.
      var _isLastBeat = _beatIdx >= _beats.length - 1;
      if (done && _cinHoldEnd && _isLastBeat) {
        var _lbLast = _chapter && _chapter.noFight ? 'Continue →' : '⚔️  Fight!';
        _drawBtn(_ctx, w, h, _lbLast);
      } else if (done) {
        _autoT += _ffHeld ? FF_RATE : 1;
        var _len  = totalText.length;
        var hold  = Math.min(CIN_HOLD_MAX,
                    Math.max(_cinHold, 60 * (_len / CIN_CPS) - _len * (TYPEWRITE_MS / 1000) * 60));
        // A voiced line finishes before the scene moves on, unless the player is fast-forwarding.
        var _voiceBusy = !_ffHeld && window.StoryVoice && StoryVoice.isSpeaking && StoryVoice.isSpeaking();
        if (_autoT >= hold && !_voiceBusy) {
          _autoT = 0;
          _advance();
          // _advance can end the scene and null _ctx. We are inside _render, so bail out of this frame.
          if (!_canvas || !_ctx) return;
        }
      } else {
        _autoT = 0;
      }

      // Progress bar across the sequence. Beat dots are unreadable at 100+ beats.
      var frac;
      if (_cinProg && _cinProg.total > 0) {
        frac = (_cinProg.done + (_beatIdx + 1) / Math.max(1, _beats.length)) / _cinProg.total;
      } else {
        frac = (_beatIdx + 1) / Math.max(1, _beats.length);
      }
      frac = _clamp(frac, 0, 1);
      _ctx.save();
      var barW = w * 0.34, barX = w * 0.5 - barW / 2, barY = h - 26;
      _ctx.fillStyle = 'rgba(255,255,255,0.12)'; _ctx.fillRect(barX, barY, barW, 2);
      _ctx.fillStyle = _ffHeld ? 'rgba(255,236,190,0.95)' : 'rgba(255,204,136,0.75)';
      _ctx.fillRect(barX, barY, barW * frac, _ffHeld ? 3 : 2);
      // Scrub readout. The bar thickening alone is too quiet to explain itself.
      if (_ffHeld) {
        _ctx.globalAlpha = 0.8; _ctx.fillStyle = '#ffecbe';
        _ctx.font = 'bold 10px \'Segoe UI\', Arial, sans-serif'; _ctx.textAlign = 'left';
        _ctx.fillText('▸▸ ' + FF_RATE + '\u00d7', barX + barW + 10, barY + 4);
        _ctx.textAlign = 'left';
      }
      _ctx.restore();

      // SKIP ends the sequence. Other clicks only advance a beat. Hidden on the final beat, where the action button is the only live control.
      if (_cinHoldEnd && _isLastBeat && done) { _skipRect = null; }
      else {
      _ctx.save();
      var sw2 = 92, sh2 = 30, sx2 = w - sw2 - 22, sy2 = h - sh2 - 22;
      _skipRect = { x: sx2, y: sy2, w: sw2, h: sh2 };
      _ctx.globalAlpha = 0.72;
      _ctx.fillStyle = 'rgba(0,0,0,0.45)'; _rrect(_ctx, sx2, sy2, sw2, sh2, 7); _ctx.fill();
      _ctx.strokeStyle = 'rgba(255,204,136,0.45)'; _ctx.lineWidth = 1; _rrect(_ctx, sx2, sy2, sw2, sh2, 7); _ctx.stroke();
      _ctx.fillStyle = '#ffcc88'; _ctx.font = '12px \'Segoe UI\', Arial, sans-serif'; _ctx.textAlign = 'center';
      _ctx.fillText('Skip  ▸▸', sx2 + sw2 / 2, sy2 + 19);
      _ctx.globalAlpha = 0.26; _ctx.fillStyle = '#aabbcc'; _ctx.font = '10px \'Segoe UI\', Arial, sans-serif';
      _ctx.fillText('Esc', sx2 + sw2 / 2, sy2 - 6);
      // Fast-forward hint, shown only at the start of the sequence.
      if (!_ffHeld && (!_cinProg || _cinProg.done < 1) && _beatIdx < 2) {
        _ctx.globalAlpha = 0.22;
        _ctx.fillText('hold to fast-forward', sx2 + sw2 / 2, sy2 + sh2 + 13);
      }
      _ctx.textAlign = 'left'; _ctx.restore();
      }
    } else {
      _skipRect = null;
      if (_beats.length > 1) {
        var dotR=4,dotGap=12,dotY=30,totalDW=_beats.length*(dotR*2+dotGap)-dotGap,dotX0=w-18-totalDW;
        for (var di=0;di<_beats.length;di++) { _ctx.beginPath(); _ctx.arc(dotX0+di*(dotR*2+dotGap)+dotR,dotY,dotR,0,Math.PI*2); _ctx.fillStyle=di===_beatIdx?'#ffcc88':'rgba(255,200,100,0.28)'; _ctx.fill(); }
      }

      if (done) { var isLast=_beatIdx>=_beats.length-1; _drawBtn(_ctx,w,h,isLast?(_chapter&&_chapter.noFight?'Continue →':'⚔️  Fight!'):'Next →'); }
      else { _ctx.save(); _ctx.globalAlpha=0.30; _ctx.fillStyle='#aabbcc'; _ctx.font='11px \'Segoe UI\', Arial, sans-serif'; _ctx.textAlign='center'; _ctx.fillText('click or press any key to skip',w*0.5,h*0.97); _ctx.textAlign='left'; _ctx.restore(); }
    }

    _raf = requestAnimationFrame(_render);
  }

  // Figure X position helpers (reads animated keyframes or static spec)
  function _pX() {
    var bs = _getBeatSpec();
    if (bs && bs.playerPos) { var fa=_getFigAnim(bs.playerPos,_beatT); return fa&&fa.x!==undefined?_canvas.width*fa.x:_canvas.width*DEF_LEFT; }
    return (bs && bs.playerX !== undefined) ? _canvas.width*bs.playerX : _canvas.width*DEF_LEFT;
  }
  function _nX() {
    var bs = _getBeatSpec();
    if (bs && bs.npcPos) { var fa=_getFigAnim(bs.npcPos,_beatT); return fa&&fa.x!==undefined?_canvas.width*fa.x:_canvas.width*DEF_RIGHT; }
    return (bs && bs.npcX !== undefined) ? _canvas.width*bs.npcX : _canvas.width*DEF_RIGHT;
  }

  function _resolveFig(who, bs, beat) {
    var isPlayer = who === 'player';
    var npcColor = (bs && bs.npcColor) ? bs.npcColor : (_spec && _spec.npcColor) ? _spec.npcColor : (_chapter && _chapter.opponentColor) || '#cc7733';

    var posArr = bs && (isPlayer ? bs.playerPos : bs.npcPos);
    if (posArr) {
      var fa = _getFigAnim(posArr, _beatT) || {};
      return {
        x:      (_canvas.width) * (fa.x !== undefined ? fa.x : (isPlayer ? DEF_LEFT : DEF_RIGHT)),
        state:  fa.state  || 'idle',
        facing: fa.facing !== undefined ? fa.facing : (isPlayer ? 1 : -1),
        alpha:  fa.alpha  !== undefined ? fa.alpha  : 1,
        scale:  fa.scale  || 1,
        show:   fa.show   !== false,
        arcY:   (fa.arcY || 0) + (fa.y || 0) * _canvas.height,
        color:  isPlayer ? '#4488ff' : npcColor,
        expr:   fa.expr || (isPlayer ? (bs && bs.playerExpr) : (bs && bs.npcExpr)) || 'neutral',
      };
    }

    var w = _canvas.width;
    if (isPlayer) {
      var defState = beat.speaker==='player' ? 'talk' : (beat.speaker==='npc' ? 'listen' : 'idle');
      return {
        x:      (bs && bs.playerX !== undefined) ? w*bs.playerX : w*DEF_LEFT,
        state:  (bs && bs.playerState) || defState,
        facing: (bs && bs.playerFacing !== undefined) ? bs.playerFacing : 1,
        alpha:  (bs && bs.playerAlpha !== undefined) ? bs.playerAlpha  : 1,
        scale:  1, show: (bs && bs.playerShow !== undefined) ? bs.playerShow : true,
        color:  '#4488ff',
        expr:   (bs && bs.playerExpr) || 'neutral',
      };
    } else {
      var defNState = beat.speaker==='npc' ? 'talk' : (beat.speaker==='player' ? 'listen' : 'idle');
      var defShow   = beat.speaker !== 'none';
      return {
        x:      (bs && bs.npcX !== undefined) ? w*bs.npcX : w*DEF_RIGHT,
        state:  (bs && bs.npcState) || defNState,
        facing: (bs && bs.npcFacing !== undefined) ? bs.npcFacing : -1,
        alpha:  (bs && bs.npcAlpha  !== undefined) ? bs.npcAlpha  : 1,
        scale:  1, show: (bs && bs.npcShow !== undefined) ? bs.npcShow : defShow,
        color:  npcColor,
        expr:   (bs && bs.npcExpr) || 'neutral',
      };
    }
  }

  // Beat transition and audio sting. transition: fade | slam | whip | none (default fade). sting: low | rise | impact | silence.
  var _TRANS_DUR = { fade: 14, slam: 8, whip: 11 };
  function _beatEnter(isFirst) {
    var bs = _getBeatSpec();
    var tType = (bs && bs.transition !== undefined) ? bs.transition : 'fade';
    if (isFirst && (!bs || bs.transition === undefined)) {
      _trans = { type: 'fade', t: 0, dur: 22 };
    } else if (_TRANS_DUR[tType]) {
      _trans = { type: tType, t: 0, dur: _TRANS_DUR[tType] };
    } else {
      _trans = null;                                       // 'none' or unknown
    }
    if (tType === 'slam') { _shakeStr = Math.max(_shakeStr || 0, 12); _shakeDecay = Math.max(_shakeDecay || 0, _shakeStr / 14); }
    var sting = bs && bs.sting;
    if (sting && typeof SoundManager !== 'undefined') {
      if      (sting === 'low'     && SoundManager.stingLow)    SoundManager.stingLow();
      else if (sting === 'rise'    && SoundManager.stingRise)   SoundManager.stingRise();
      else if (sting === 'impact'  && SoundManager.stingImpact) SoundManager.stingImpact();
      else if (sting === 'silence') SoundManager._cosmicSilenceTimer = 50;
    }
    var _vb = _beats[_beatIdx];
    if (_vb && window.StoryVoice) StoryVoice.speak(_vb.lines.join(' '), _vb.speaker);
  }

  function _advance() {
    var beat = _beats[_beatIdx]; if(!beat){_finish();return;}
    var total = beat.lines.join(' ');
    if (_typedLen < total.length) { _typedLen=total.length; _lastTypeTime=performance.now(); return; }
    _beatIdx++; _beatT = 0;
    if (_beatIdx >= _beats.length) { _finish(); return; }
    _typedLen=0; _lastTypeTime=performance.now();
    _beatEnter(false);
  }

  function _finish() { _cleanup(); if(window.StoryVoice)StoryVoice.stop(); if(_callback){var cb=_callback;_callback=null;cb();} }

  // Pairs with gameLoop()'s _storySceneHold check. Held keys are dropped on both edges.
  function _holdBegin() {
    if (typeof storyHoldGameplay === 'function') storyHoldGameplay(true);
    else window._storySceneHold = true;
  }
  function _holdEnd() {
    if (!window._storySceneHold) return;
    if (typeof storyHoldGameplay === 'function') storyHoldGameplay(false);
    else window._storySceneHold = false;
    // No loop restart here: gameLoop re-queues itself like `paused`, so the rAF chain is never broken or duplicated.
  }

  function _cleanup() {
    _holdEnd();
    if(_raf){cancelAnimationFrame(_raf);_raf=null;}
    if(_canvas){
      _canvas.removeEventListener('click',_onInteract);
      _canvas.removeEventListener('pointerdown',_onPtrDown);
      document.removeEventListener('pointerup',_onPtrUp);
      document.removeEventListener('keydown',_onInteract);
      document.removeEventListener('keyup',_onKeyUp);
      if(_canvas.parentNode)_canvas.parentNode.removeChild(_canvas);
      _canvas=null; _ctx=null;
    }
    _spec=null; _beatT=0; _cam.zoom=1; _cam.cx=0.5; _cam.cy=0.5;
    _shakeStr=0; _flashAlpha=0; _trans=null;
    // Cinematic flags are per invocation, so a leaked _cinMode can't turn a normal narrative into an auto-advancing reel.
    _cinMode=false; _autoT=0; _onSkip=null; _skipRect=null; _cinLabel=null; _cinProg=null;
    _ffHeld=false; _ptrAt=0; _keyFF=false; _cinHoldEnd=false;
  }

  // Skip ends the whole sequence. onSkip (if given) jumps to the end state; otherwise the normal callback runs.
  function _skipAll() {
    var skip = _onSkip, cb = _callback;
    _onSkip = null; _callback = null;
    _cleanup();
    if (skip) skip(); else if (cb) cb();
  }

  // Hold to fast-forward. FF_ARM_MS keeps an ordinary click, which advances one beat, from counting as a scrub.
  var FF_ARM_MS = 160;
  function _ffUpdate() {
    _ffHeld = _cinMode && (_keyFF || (_ptrAt > 0 && performance.now() - _ptrAt > FF_ARM_MS));
  }
  function _onPtrDown() { _ptrAt = performance.now(); }
  function _onPtrUp()   { _ptrAt = 0; _ffHeld = _keyFF; }
  function _onKeyUp(e)  {
    if (e && (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight')) {
      _keyFF = false; _ffUpdate();
    }
  }

  function _onInteract(e) {
    if (e && e.type === 'keydown') {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape') { if (_cinMode) { e.preventDefault(); _skipAll(); } return; }
      if (_cinMode && (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowRight')) {
        e.preventDefault(); _keyFF = true; _ffUpdate(); return;
      }
    }
    // A long press was a fast-forward, not a click. Swallow the release so it doesn't advance.
    if (e && e.type === 'click' && _ptrAt > 0 && performance.now() - _ptrAt > FF_ARM_MS) {
      _ptrAt = 0; _ffHeld = _keyFF; return;
    }
    // Clicks on SKIP exit. Other clicks just advance.
    if (_cinMode && e && e.type === 'click' && _skipRect && _canvas) {
      var r = _canvas.getBoundingClientRect();
      var mx = (e.clientX - r.left) * (_canvas.width / r.width);
      var my = (e.clientY - r.top)  * (_canvas.height / r.height);
      if (mx >= _skipRect.x && mx <= _skipRect.x + _skipRect.w &&
          my >= _skipRect.y && my <= _skipRect.y + _skipRect.h) { _skipAll(); return; }
    }
    _advance();
  }

  // opts, all optional: cinematic (auto-advance, drift, progress bar, real skip), hold (frames per line, default 80),
  // onSkip, label (chapter title override), progress {done,total}, holdLastBeat (cinematic only: hold on the final beat).
  function showNarrativeScene(lines, chapter, callback, opts) {
    if (!lines || !lines.length) { if(callback)callback(); return; }
    _cleanup();
    _chapter=chapter||null; _callback=callback||null;
    opts = opts || {};
    _cinMode  = !!opts.cinematic;
    _cinHold  = opts.hold || 80;
    _onSkip   = opts.onSkip || null;
    _cinLabel = opts.label || null;
    _cinProg  = opts.progress || null;
    _cinHoldEnd = !!opts.holdLastBeat;
    _autoT    = 0;
    _driftSeed = Math.random() * 100;
    _beats=_parseBeats(lines); _beatIdx=0; _typedLen=0; _t=0; _beatT=0; _figMem={};
    _lastTypeTime=performance.now();
    if (!_beats.length) { if(_callback){var cb=_callback;_callback=null;cb();}return; }

    var chId = chapter && chapter.id;
    _spec = (chId !== undefined && window.STORY_SCENE_SPECS && STORY_SCENE_SPECS[chId]) ? STORY_SCENE_SPECS[chId] : null;
    _actStyle = _getActStyle(chId);
    // Narrated beat with no visual spec (coverage check)
    if (chId !== undefined && !_spec) console.info('[StoryScene] chapter', chId, 'has narrative but no STORY_SCENE_SPECS entry — rendering with act style only');

    // Freeze the match underneath. Scenes play between levels with the loop running; gameLoop() parks on this flag and smb-input.js stops feeding keys.
    _holdBegin();

    _canvas = document.createElement('canvas');
    _canvas.width = window.innerWidth; _canvas.height = window.innerHeight;
    _canvas.style.cssText = 'position:fixed;inset:0;z-index:9100;cursor:pointer;display:block;';
    document.body.appendChild(_canvas);
    _ctx = _canvas.getContext('2d');
    _initStars(75, _canvas.width, _canvas.height);
    _canvas.addEventListener('click', _onInteract);
    _canvas.addEventListener('pointerdown', _onPtrDown);
    document.addEventListener('pointerup', _onPtrUp);
    document.addEventListener('keydown', _onInteract);
    document.addEventListener('keyup', _onKeyUp);
    _beatEnter(true);
    _raf = requestAnimationFrame(_render);
  }

  window.showNarrativeScene = showNarrativeScene;
  // Number of scene beats a line array parses into, so a second half can continue the first half's staging.
  window._storyBeatCount = function (lines) { return _parseBeats(lines || []).length; };
  // Dev hook: renders the figure rig in isolation (contact sheet). The game never calls it.
  window._sceneDrawFigure = _drawFigure;
  // Test-only: lets the contact-sheet harness scrub the beat clock. The render loop overwrites _beatT every frame anyway.
  window._sceneSetBeatT = function (v) { _beatT = v; };
  // Dev hook for the workbench scene viewer (tools/workbench/figures.js): read-only position in the running scene.
  window._sceneDebugState = function () {
    if (!_canvas) return null;
    var b = _beats[_beatIdx];
    return { beat: _beatIdx, beats: _beats.length, beatT: _beatT, t: _t,
             staged: (_spec && _spec.beats) ? _spec.beats.length : 0,
             offset: (_chapter && _chapter._sceneBeatOffset) || 0,
             text: b ? b.lines.join(' ') : '', speaker: b ? b.speaker : null,
             typed: _typedLen >= (b ? b.lines.join(' ').length : 0) };
  };
})();
