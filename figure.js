/* DEEDS figure v1 · the toy figure (locked Aug 31): 5 heads tall, one joined soft body, the rounded cylinder head, eight hairstyles.
   Shared by avatar.html (the wardrobe) and the garden world (garden/world/index.html), so one body draws everywhere.
   Load after wardrobe.js: the parts and the palette live there. Nothing here talks to the server.
   window.Figure.build({eq:{slot:item_id}, colorway:{item_id:colour id}, face:{overrides}, slots:[which slots to draw]})
     returns {fig (a THREE.Group, head centre at the origin, front is +z, 1 unit = 0.09 H, the ground at dims.ground),
              dims, arms [left, right], legs [left, right], head (the head group: skull, face, hair, hat), hat (the hat group), ctx}. */
(function(){
  var W = window.Wardrobe, U = W && W.util;
  var K = 1 / 0.09;
  var SPEC = {
    'body.a': {headZ:0.90, headH:0.20, headD:0.185, chinZ:0.80, neckZ:0.78, neckW:0.095, collarZ:0.78, hemZ:0.465, sleeveZ:0.64,
      shoulder:[0.145, 0.735], elbowZ:0.585, wristZ:0.45, handL:0.095, upperR:[0.078, 0.07], foreR:[0.07, 0.06], handW:0.075, handT:0.058, abduct:6,
      hip:[0.075, 0.42], kneeZ:0.24, ankleZ:0.08, footAnkle:0.06, thighR:[0.12, 0.105], shinR:[0.105, 0.09], foot:[0.098, 0.165, 0.06, 0.11, 0.055], stance:0.30,
      body:[[0.39, 0.05, 0.03], [0.40, 0.10, 0.06], [0.42, 0.113, 0.07], [0.48, 0.112, 0.07], [0.55, 0.108, 0.069], [0.62, 0.118, 0.073], [0.68, 0.132, 0.077], [0.72, 0.14, 0.078], [0.74, 0.145, 0.076], [0.752, 0.13, 0.07], [0.762, 0.105, 0.062], [0.77, 0.075, 0.052], [0.776, 0.055, 0.046], [0.778, 0.045, 0.045]],
      shell:[[0.465, 0.115, 0.07], [0.466, 0.14, 0.08], [0.55, 0.145, 0.084], [0.66, 0.155, 0.088], [0.72, 0.162, 0.088], [0.74, 0.165, 0.085], [0.755, 0.155, 0.082], [0.765, 0.135, 0.074], [0.772, 0.11, 0.066], [0.778, 0.08, 0.058], [0.782, 0.055, 0.052], [0.784, 0.045, 0.045]],
      pants:{waistZ:0.465, waistR:0.132, hipR:0.136, crotchZ:0.39, crotchR:0.136, r:[0.062, 0.058, 0.058], hemZ:0.075},
      eyeX:0.034, eyeZ:0.888, eyeR:0.19, noseZ:0.87, mouthZ:0.85, mouthR:0.25, blush:0, hair:'crop', ears:true, hatY:-0.1, hatScale:1.15, n:2.3, sleeveDome:0.25},
    'body.b': {headZ:0.90, headH:0.20, headD:0.185, chinZ:0.80, neckZ:0.78, neckW:0.088, collarZ:0.78, hemZ:0.51, sleeveZ:0.70,
      shoulder:[0.135, 0.735], elbowZ:0.585, wristZ:0.455, handL:0.09, upperR:[0.07, 0.062], foreR:[0.062, 0.054], handW:0.068, handT:0.052, abduct:6,
      hip:[0.08, 0.43], kneeZ:0.24, ankleZ:0.08, footAnkle:0.06, thighR:[0.125, 0.10], shinR:[0.10, 0.085], foot:[0.093, 0.165, 0.06, 0.11, 0.055], stance:0.27,
      body:[[0.40, 0.05, 0.03], [0.41, 0.103, 0.062], [0.43, 0.118, 0.07], [0.48, 0.124, 0.072], [0.54, 0.118, 0.068], [0.60, 0.104, 0.064], [0.64, 0.115, 0.07, 0.004], [0.68, 0.125, 0.074, 0.006], [0.72, 0.128, 0.072, 0.002], [0.74, 0.135, 0.07], [0.752, 0.12, 0.066], [0.762, 0.095, 0.058], [0.77, 0.068, 0.05], [0.776, 0.05, 0.044], [0.778, 0.04, 0.04]],
      shell:[[0.51, 0.10, 0.06], [0.512, 0.13, 0.076], [0.55, 0.128, 0.075], [0.60, 0.115, 0.07], [0.64, 0.126, 0.078, 0.004], [0.68, 0.136, 0.084, 0.005], [0.72, 0.14, 0.082, 0.002], [0.74, 0.145, 0.078], [0.753, 0.135, 0.074], [0.763, 0.115, 0.066], [0.771, 0.09, 0.058], [0.778, 0.065, 0.052], [0.782, 0.05, 0.05], [0.784, 0.04, 0.04]],
      pants:{waistZ:0.49, waistR:0.132, hipR:0.134, crotchZ:0.39, crotchR:0.134, r:[0.06, 0.056, 0.056], hemZ:0.075},
      eyeX:0.034, eyeZ:0.888, eyeR:0.19, noseZ:0.87, mouthZ:0.85, mouthR:0.25, blush:0, hair:'bob', ears:true, hatY:-0.1, hatScale:1.15, n:2.3, sleeveDome:0.1, sleevePad:0.13, collarLift:0.06}
  };
  var FACE = {};
  function dimsFor(body, face){
    var s = Object.assign({}, SPEC[body] || SPEC['body.a'], face || {}); function Y(z){ return (z - s.headZ) * K; }
    var rows = function(list){ return list.map(function(r){ return {y:Y(r[0]), rx:r[1] * K, rz:r[2] * K, cy:(r[3] || 0) * K}; }); };
    var d = {K:K, spec:s, Y:Y, ground:Y(s.ankleZ - (s.footAnkle || s.ankleZ)), headRy:s.headH / 2 * K, headRz:s.headD / 2 * K, chinY:Y(s.chinZ), hatY:s.hatY,
      top:Y(s.shoulder[1]), bottom:Y(s.hemZ), collarY:Y(s.collarZ) + (s.collarLift == null ? 0.12 : s.collarLift), neckR:s.neckW / 2 * K, neckY:Y(s.neckZ), chestY:Y(0.68),
      body:rows(s.body), shell:rows(s.shell), n:s.n || 2.4,
      shoulderX:s.shoulder[0] * K, abduct:s.abduct * Math.PI / 180,
      upper:(s.shoulder[1] - s.elbowZ) * K, fore:(s.elbowZ - s.wristZ) * K, hand:s.handL * K, handW:s.handW * K, handT:s.handT * K,
      upperR:s.upperR[0] / 2 * K, upperR2:s.upperR[1] / 2 * K, foreR:s.foreR[0] / 2 * K, foreR2:s.foreR[1] / 2 * K, handR:s.handW / 2 * K,
      hipX:s.hip[0] * K, hipY:Y(s.hip[1]), thigh:(s.hip[1] - s.kneeZ) * K, shin:(s.kneeZ - s.ankleZ) * K,
      splay:Math.min(0.06, Math.atan2(s.stance / 2 - s.foot[0] / 2 - s.hip[0], s.hip[1] - s.ankleZ)), toeYaw:2 * Math.PI / 180,
      thighR:s.thighR[0] / 2 * K, thighR2:s.thighR[1] / 2 * K, shinR:s.shinR[0] / 2 * K, shinR2:s.shinR[1] / 2 * K,
      foot:{w:s.foot[0] * K, l:s.foot[1] * K, h:s.foot[2] * K, fwd:s.foot[3] * K, back:s.foot[4] * K, ankleUp:(s.footAnkle || s.ankleZ) * K},
      sleeve:(s.shoulder[1] - s.sleeveZ) * K, sleeveDome:s.sleeveDome, sleevePad:s.sleevePad,
      pants:{waistY:Y(s.pants.waistZ), waistR:s.pants.waistR * K, hipR:s.pants.hipR * K, crotchY:Y(s.pants.crotchZ), crotchR:s.pants.crotchR * K, r:s.pants.r.map(function(r){ return r * K; }), hemY:-(s.hip[1] - s.pants.hemZ) * K, pad:s.pants.pad}};
    d.chestRz = U.rowAt(d.body, d.chestY).rz; d.chestCy = U.rowAt(d.body, d.chestY).cy || 0;
    d.S = d.shoulderX / 1.5;
    // legacy keys for builders written against the old figure
    d.shoulder = d.shoulderX; d.chest = U.rowAt(d.body, d.chestY).rx; d.waist = U.rowAt(d.body, Y(0.55)).rx; d.hips = U.rowAt(d.body, Y(0.48)).rx; d.depth = d.chestRz / d.chest;
    return d;
  }
  function disposeTree(o){ o.traverse(function(n){ if (n.geometry) n.geometry.dispose(); if (n.material){ [].concat(n.material).forEach(function(m){ if (m.map) m.map.dispose(); m.dispose(); }); } }); }
  function headProfile(d, y){
    var ry = d.headRy, ct = 0.6, cb = 0.55, pt = 2.8, pb = 2.4;
    if (y > ry - ct){ var t = Math.min(1, (y - (ry - ct)) / ct); return Math.pow(Math.max(0, 1 - Math.pow(t, pt)), 1 / pt); }
    if (y < -ry + cb){ var b = Math.min(1, ((-ry + cb) - y) / cb); return Math.pow(Math.max(0, 1 - Math.pow(b, pb)), 1 / pb); }
    return 1;
  }
  function headPoint(d, phi, theta, k){
    var y = Math.cos(theta) * d.headRy, r = headProfile(d, y);
    return new THREE.Vector3(r * Math.sin(phi) * k, y * k, r * Math.cos(phi) * d.headRz * k);
  }
  // put a feature on the face at lateral x and height y (head space), facing outward
  function onFace(fig, d, geo, m, x, y, push){
    var r = headProfile(d, y), z = d.headRz * Math.sqrt(Math.max(0, r * r - x * x));
    var p = new THREE.Vector3(x, y, z), nrm = new THREE.Vector3(x, 0, z / (d.headRz * d.headRz)).normalize();
    var o = new THREE.Mesh(geo, m); o.position.copy(p).addScaledVector(nrm, push || 0); o.lookAt(p.clone().addScaledVector(nrm, 3)); o.receiveShadow = true; fig.add(o); return o;
  }
  // ---------- hair: one parametric cap, nine styles ----------
  // seven styles for either body: Crop, Buzz, Side part, Mid, Long, Bald, Hair on the sides (his cut Sep 1: no guy mid length, the girl's short is the crop)
  // front/temple/ear/nape = hairline heights in head space (head radius 1, top at d.headRy); hem = where a hanging style ends;
  // hang = how far the hanging sheet flares; open = the half angle of the face opening; part = side of a comb over; band = sides only
  var HAIRSTYLE = {
    'hair.crop':  {name:'Crop',            front:0.44, temple:0.0,  ear:-0.04, nape:-0.66, vol:1.11},
    'hair.buzz':  {name:'Buzz',            front:0.40, temple:-0.02, ear:-0.06, nape:-0.62, vol:1.045},
    'hair.side':  {name:'Side part',       front:0.42, temple:0.02, ear:-0.04, nape:-0.66, vol:1.13, part:1},
    'hair.bald':  {name:'Bald'},
    'hair.sides': {name:'Hair on the sides', front:0.6, temple:-0.12, ear:-0.16, nape:-0.66, vol:1.08, band:0.24},
    'hair.rows':  {name:'Cornrows',        front:0.42, temple:-0.02, ear:-0.06, nape:-0.62, vol:1.025, rows:[-80, -60, -40, -20, 0, 20, 40, 60, 80], braid:0.068},
    'hair.bob':   {name:'Mid',             front:0.46, temple:0.0,  ear:-0.3,  nape:-1.2, vol:1.12, hem:'chin', hang:1.22, open:0.6},
    'hair.long':  {name:'Long',            front:0.46, temple:0.0,  ear:-0.3,  nape:-2.4, vol:1.12, hem:-2.45, hang:1.3, open:0.55, back:-0.18}
  };
  function hairStyle(d, hairM, o, hatted){
    if (!o || !o.front) return null;
    if (o.rows){ var gg = new THREE.Group(); gg.add(hairCap(d, hairM, o, hatted)); gg.add(braids(d, hairM, o, hatted)); return gg; }
    return hairCap(d, hairM, o, hatted);
  }
  function hairCap(d, hairM, o, hatted){
    var ry = d.headRy, top = hatted ? 0.62 : ry, hem = o.hem === 'chin' ? d.chinY - 0.12 : o.hem, hanging = hem != null, open = o.open || 0.6, part = o.part || 0;
    var m = hairM; if (hanging || o.band){ m = hairM.clone(); m.side = THREE.DoubleSide; }
    function sm(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
    function capEdge(phi){
      var a = Math.abs(phi), fr = o.front, tm = o.temple;
      if (part){ var sw = phi * part; fr += sw > 0 ? -0.12 * sm(sw / 0.9) : 0.14 * sm(-sw / 0.9); }
      if (a < 0.7) return fr + 0.04 * Math.cos(a / 0.7 * Math.PI);
      if (a < 1.4) return fr - 0.04 - Math.pow((a - 0.7) / 0.7, 1.3) * (fr - 0.04 - tm);
      if (a < 2.1) return tm - (a - 1.4) / 0.7 * (tm - o.ear);
      return o.ear - (a - 2.1) / 1.04 * (o.ear - o.nape);
    }
    function bottom(phi){
      if (!hanging) return capEdge(phi);
      var a = Math.abs(phi);
      if (a < open) return capEdge(phi);
      if (a < open + 0.6) return capEdge(phi) + (hem - capEdge(phi)) * Math.pow(sm((a - open) / 0.6), 1.3);
      return hem - 0.05 * Math.min(1, (a - open - 0.6) / 1.5);
    }
    var topCut = o.band ? o.band : null;
    return U.mesh(U.grid(function(u, v){
      var phi = u * Math.PI * 2 - Math.PI, a = Math.abs(phi), yTop = topCut != null ? topCut : top, y0 = Math.min(bottom(phi), yTop), ys = yTop + (y0 - yTop) * v;
      var yc = Math.max(-ry * 0.999, Math.min(ry * 0.999, ys)), th = Math.acos(yc / ry), p = headPoint(d, phi, th, 1), r = Math.hypot(p.x, p.z);
      var k = o.vol + (1 - o.vol) * Math.pow(v, 1.6);
      if (part){ var sw = phi * part; k += 0.17 * sm(sw / 0.8) * sm((ys - 0.05) / 0.5) * (1 - v * 0.4); }
      if (topCut != null){ k = 1 + (o.vol - 1) * Math.min(1, v / 0.25) * (1 - Math.pow(v, 3)); if (y0 >= yTop - 1e-6) k = 1; }
      else if (!hanging) k = Math.max(k, v > 0.94 ? 0.985 : k);
      var hr = r * k, q;
      if (hanging){
        var f = Math.max(0, Math.min(1, (0.3 - ys) / Math.max(0.6, (0.3 - hem) * 0.75))), flare = 1.06 + (o.hang - 1.06) * Math.sin(Math.PI * Math.min(1, f * 1.1)) + (o.hang - 1.06) * 0.35 * f;
        var wgt = sm((0.5 - ys) / 0.7), tuck = v > 0.86 ? 1 - (0.1 + 0.14 * Math.max(0, 1 - a / 1.6)) * ((v - 0.86) / 0.14) : 1;
        hr = Math.max(r * k, flare * wgt) * tuck;
        var earZone = Math.max(0, 1 - Math.abs(a - Math.PI / 2) / 0.42) * Math.max(0, 1 - Math.abs(ys + 0.12) / 0.4); hr *= 1 - 0.16 * earZone;
      }
      var sc = hr / Math.max(1e-6, r), lift = (hr / Math.max(1e-6, r) - 1) * ry * sm((ys - 0.35) / 0.7);
      q = new THREE.Vector3(p.x * sc, ys + (ys > 0.35 ? lift : 0), p.z * sc * 1.03 - 0.03 + (hanging && ys < -0.6 ? (o.back || 0) * Math.min(1, (-0.6 - ys) / 1.2) : 0));
      if (v < 0.001 && topCut == null) q.set(0, top * (hanging ? 1.1 : o.vol), 0);
      if (hatted && v < 0.1) q.multiplyScalar(0.92);
      return q;
    }, 80, 32), m);
  }
  function braids(d, hairM, o, hatted){
    // each braid follows the scalp in a plane through the front-back axis, from the hairline to the nape
    var g = new THREE.Group(), y0 = -0.1, rz = d.headRz;
    function onHead(dir){ var lo = 0.2, hi = 1.6; for (var i = 0; i < 18; i++){ var R = (lo + hi) / 2, x = dir.x * R, y = y0 + dir.y * R, z = dir.z * R, pr = y >= d.headRy || y <= -d.headRy ? 0 : headProfile(d, y); if (pr <= 0 || x * x + (z / rz) * (z / rz) > pr * pr) hi = R; else lo = R; } return (lo + hi) / 2; }
    function hairline(phi){ var a = Math.abs(phi); if (a < 0.7) return o.front + 0.04 * Math.cos(a / 0.7 * Math.PI); if (a < 1.4) return o.front - 0.04 - Math.pow((a - 0.7) / 0.7, 1.3) * (o.front - 0.04 - o.temple); if (a < 2.1) return o.temple - (a - 1.4) / 0.7 * (o.temple - o.ear); return o.ear - (a - 2.1) / 1.04 * (o.ear - o.nape); }
    o.rows.forEach(function(deg){
      var lam = deg * Math.PI / 180, dx = Math.sin(lam), dy = Math.cos(lam), pts = [];
      for (var t = -75; t <= 125; t += 5){
        var th = t * Math.PI / 180, dir = new THREE.Vector3(dx * Math.cos(th), dy * Math.cos(th), Math.sin(th) * -1);
        var R = onHead(dir), p = new THREE.Vector3(dir.x * R, y0 + dir.y * R, dir.z * R), phi = Math.atan2(p.x, p.z);
        if (p.y < hairline(phi) - 0.02){ if (pts.length) break; else continue; }
        if (hatted && p.y > 0.55) continue;
        pts.push(p.clone().addScaledVector(dir, o.braid * 0.55));
      }
      if (pts.length > 3) g.add(U.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, o.braid, 8, false), hairM));
    });
    return g;
  }
  function build(o){
    o = o || {}; var EQ = o.eq || {}, COLORWAY = o.colorway || {}, SLOTS = o.slots || ['torso', 'legs', 'feet', 'neck', 'ears', 'hands', 'back', 'attach', 'head', 'topper'];
    var W = window.Wardrobe, U = W.util;
    var fig = new THREE.Group(), headG = new THREE.Group(); fig.add(headG);
    var d = dimsFor(EQ.body, o.face), s = d.spec, skinHex = W.skins[EQ.skin] || W.skins['skin.s3'];
    var hid = EQ.hair || '', hst = HAIRSTYLE[hid], hairHex;
    if (hst){ var hcw = W.colorways[hid], hpick = hcw && (hcw.filter(function(c){ return c.id === COLORWAY[hid]; })[0] || hcw.filter(function(c){ return c.id === W.defaultColorway[hid]; })[0] || hcw[0]); hairHex = hpick ? hpick.hex : W.hairs['hair.h2']; }
    else { hst = HAIRSTYLE[s.hair === 'bob' ? 'hair.bob' : 'hair.crop']; hairHex = W.hairs[hid] || W.hairs['hair.h1']; }
    var skin = U.mat(skinHex, 0.88), hairM = U.mat(hairHex, 0.92), ink = U.mat('#2b2320', 0.55), white = U.mat('#ffffff', 0.5), mouthM = U.mat('#8a5443', 0.85);
    var blushM = U.mat('#' + U.col(skinHex).lerp(U.col('#e8786e'), s.blush || 0).getHexString(), 0.9), eyeR = s.eyeR || 0.16, mouthR = s.mouthR || 0.3;
    // head
    headG.add(U.mesh(U.grid(function(u, v){ return headPoint(d, u * Math.PI * 2, v * Math.PI, 1); }, 72, 48), skin));
    if (s.ears){ [-1, 1].forEach(function(side){ var e = U.mesh(new THREE.SphereGeometry(0.25, 20, 14), skin, side * 0.97, -0.05, -0.04); e.scale.set(0.32, 1, 0.72); headG.add(e); }); }
    var eyeY = d.Y(s.eyeZ), eyeX = s.eyeX * K;
    [-1, 1].forEach(function(side){
      // solid dark eyes with one catchlight: the toy look
      onFace(headG, d, new THREE.SphereGeometry(eyeR, 24, 16), ink, side * eyeX, eyeY, 0.02).scale.set(1, 1.3, 0.35);
      if (s.blush){ var bl = onFace(headG, d, new THREE.SphereGeometry(0.19, 20, 12), blushM, side * (eyeX + 0.22), eyeY - 0.44, 0.003); bl.scale.set(1.5, 0.8, 0.2); bl.castShadow = false; }
      var hl = onFace(headG, d, new THREE.SphereGeometry(0.055 * eyeR / 0.16, 10, 8), white, side * eyeX - 0.34 * eyeR, eyeY + 0.47 * eyeR, 0.09); hl.castShadow = false; hl.receiveShadow = false;
    });
    onFace(headG, d, new THREE.SphereGeometry(0.085, 18, 12), skin, 0, d.Y(s.noseZ), 0.02).scale.set(0.85, 0.9, 0.6);
    var mouth = onFace(headG, d, new THREE.TorusGeometry(mouthR, 0.032, 8, 22, 1.5), mouthM, 0, d.Y(s.mouthZ) + 0.4 * mouthR, 0.02); mouth.rotateZ(Math.PI / 2 - 0.75 + Math.PI);
    var hatted = EQ.head && EQ.head !== 'head.bare' && !!W.parts[EQ.head];
    var hair = hairStyle(d, hairM, hst, hatted); if (hair){ hair.castShadow = false; headG.add(hair); }
    // neck and torso, one soft body
    fig.add(U.mesh(new THREE.CylinderGeometry(d.neckR, d.neckR + 0.08, (d.chinY - d.neckY) + 0.9, 40), skin, 0, (d.chinY + d.neckY) / 2 - 0.15, -0.02));
    fig.add(U.mesh(U.tube(d.body, {n:d.n}), skin));
    // arms and legs: one smooth piece each, mitten hands
    var arms = [], legs = [];
    [-1, 1].forEach(function(side){
      var i = side < 0 ? 0 : 1;
      var a = new THREE.Group(); a.position.set(side * d.shoulderX, d.top, 0); a.rotation.z = side * d.abduct; fig.add(a); arms[i] = a;
      a.add(U.mesh(U.capsule(d.upperR, d.foreR2, d.upper + d.fore - 0.12, 36), skin, 0, -0.12, 0));
      var hand = U.mesh(U.capsule(d.handR, d.handR * 0.9, d.hand - d.handR, 24), skin, 0, -d.upper - d.fore + 0.08, 0.02); hand.scale.set(1, 1, Math.max(0.7, d.handT / (d.handR * 2))); a.add(hand);
      var thumb = U.mesh(U.capsule(d.handR * 0.36, d.handR * 0.3, d.hand * 0.36, 12), skin, -side * (d.handR * 0.6), -d.upper - d.fore - 0.05, 0.16); thumb.rotation.z = side * 0.35; thumb.rotation.x = -0.25; a.add(thumb);
      var l = new THREE.Group(); l.position.set(side * d.hipX, d.hipY, 0); l.rotation.z = side * d.splay; fig.add(l); legs[i] = l;
      l.add(U.mesh(U.capsule(d.thighR, d.shinR2, d.thigh + d.shin, 36), skin));
    });
    var ctx = {dims:d, arms:arms, legs:legs, skin:skinHex, hair:hairHex, colorway:null};
    var hatG = new THREE.Group(); hatG.position.y = d.hatY; var hs = s.hatScale || 1; hatG.scale.set(hs, hs, hs); headG.add(hatG);
    SLOTS.forEach(function(slot){
      var id = EQ[slot], part = id && W.parts[id]; if (!part) return;
      var cw = W.colorways[id], pick = cw && (cw.filter(function(c){ return c.id === COLORWAY[id]; })[0] || cw.filter(function(c){ return c.id === W.defaultColorway[id]; })[0] || cw[0]);
      ctx.colorway = pick ? pick.hex : null;
      var g = part(ctx); if (g){ if (slot === 'head') hatG.add(g); else fig.add(g); }
    });
    fig.traverse(function(n){ if (n.isMesh && n.castShadow !== false){ n.castShadow = true; n.receiveShadow = true; } });
    return {fig:fig, dims:d, arms:arms, legs:legs, head:headG, hat:hatG, ctx:ctx, hatted:hatted};
  }
  window.Figure = {K:K, SPEC:SPEC, HAIRSTYLE:HAIRSTYLE, dimsFor:dimsFor, build:build, dispose:disposeTree, version:1};
})();
