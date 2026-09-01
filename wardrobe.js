/* DEEDS wardrobe v2.0 · every part the avatar can wear, drawn in geometry on a unit head (radius 1 = half the head width, head centre at the origin).
   Built to the Aug 30 DEEDS Avatar Geometry spec (Type A base body, Type B woman): 1 unit = 0.0675 H, so the whole figure is 14.8 units tall.
   window.Wardrobe.parts[item_id] = function(ctx) returns a THREE.Group to add at the figure root, or null.
   ctx: { dims (body measurements, see the contract below), arms [left, right groups: shoulder joint at the origin, the arm hangs down -y, already abducted],
          legs [left, right groups: hip joint at the origin, the leg hangs down -y], skin (hex), hair (hex), colorway (hex or null) }
   dims contract (units): top = shoulder joint line y, bottom = t-shirt hem y, collarY, neckR, chestY, chestRz,
          body = rows {y, rx, rz, cy} bottom to top (the skin surface), shell = rows for a garment over the torso, n = section exponent,
          upper, fore, hand (lengths), upperR/upperR2, foreR/foreR2 (proximal/distal radii), handW, handT,
          hipX, thigh, shin, thighR/thighR2, shinR/shinR2, foot {l, w, h, fwd, back, ankleUp}, sleeve (short sleeve length),
          pants {waistY, waistR, hipR, crotchY, r: [thigh, knee, hem], hemY (leg space)}, S = accessory scale (1 on the old figure), ground, hatY.
          Legacy keys shoulder/chest/waist/hips/depth are still filled for builders written against the old figure.
   Add a garment: one builder per catalog id. Nothing here talks to the server. */
(function(){
  var W = window.Wardrobe = { B: 0.40, parts: {}, colorways: {}, skins: {}, hairs: {}, defaultColorway: {} };
  var B = W.B;

  W.skins = {'skin.s1':'#f3d2b6','skin.s2':'#ecc09c','skin.s3':'#e2ab82','skin.s4':'#d4936a','skin.s5':'#bd7a52','skin.s6':'#9e603e','skin.s7':'#7b482d','skin.s8':'#553220','skin.moss':'#7f9a63','skin.teal':'#5f9c9a','skin.lilac':'#b39ad0','skin.clay':'#c4714f'};
  W.hairs = {'hair.h1':'#3a271b','hair.h2':'#4a3223','hair.h3':'#6b3f24','hair.h4':'#cbb17a','hair.h5':'#a5522a','hair.h6':'#9a9a94','hair.h7':'#6a7f4a','hair.h8':'#6a3a5c'};
  var SIX = [
    {id:'brown',  name:'Brown',  hex:'#3d2a1d'},
    {id:'cream',  name:'Cream',  hex:'#e6ddd0'},
    {id:'tan',    name:'Tan',    hex:'#a9703a'},
    {id:'forest', name:'Forest', hex:'#22362d'},
    {id:'black',  name:'Black',  hex:'#232323'},
    {id:'white',  name:'White',  hex:'#f0efec'}
  ];
  W.colorways['head.cap'] = SIX; W.defaultColorway['head.cap'] = 'black';
  W.colorways['head.bucket'] = SIX; W.defaultColorway['head.bucket'] = 'black';
  // the style and colour rule, extended from hats to clothes: one catalog row per style, the colour chosen after
  W.colorways['torso.tee'] = SIX; W.defaultColorway['torso.tee'] = 'white';
  W.colorways['legs.trousers'] = SIX; W.defaultColorway['legs.trousers'] = 'white';
  var SHOE = [{id:'white', name:'White', hex:'#f4f4f2'}, {id:'gold', name:'Gold', hex:'#c9a43a'}, {id:'black', name:'Black', hex:'#232323'}, {id:'brown', name:'Brown', hex:'#6b4a2f'}];
  W.colorways['feet.sneakers'] = SHOE; W.defaultColorway['feet.sneakers'] = 'white';
  var TRACK = SIX.concat([{id:'navy', name:'Navy', hex:'#1f2a44'}]);
  W.colorways['torso.track'] = TRACK; W.defaultColorway['torso.track'] = 'navy';
  W.colorways['legs.track'] = TRACK; W.defaultColorway['legs.track'] = 'navy';
  W.colorways['torso.zip'] = SIX; W.defaultColorway['torso.zip'] = 'black';
  W.colorways['torso.hoodie'] = SIX; W.defaultColorway['torso.hoodie'] = 'black';
  // hair styles are catalog rows, the colour is chosen after (the eight hair colours)
  var HAIRCOL = [['h1', 'Ink'], ['h2', 'Brown'], ['h3', 'Chestnut'], ['h4', 'Sand'], ['h5', 'Rust'], ['h6', 'Ash'], ['h7', 'Moss'], ['h8', 'Plum']].map(function(p){ return {id:p[0], name:p[1], hex:W.hairs['hair.' + p[0]]}; });
  ['hair.crop', 'hair.buzz', 'hair.side', 'hair.rows', 'hair.bob', 'hair.long', 'hair.bald', 'hair.sides'].forEach(function(id){ W.colorways[id] = HAIRCOL; W.defaultColorway[id] = 'h2'; });

  // ---------- helpers ----------
  function col(hex, k){ var c = new THREE.Color(hex); if (k) c.multiplyScalar(k); return c.convertSRGBToLinear(); }
  function mat(hex, rough, k){ return new THREE.MeshStandardMaterial({color:col(hex, k), roughness:rough == null ? 0.9 : rough, metalness:0}); }
  function glow(hex, em, i, rough){ var m = mat(hex, rough == null ? 0.6 : rough); m.emissive = col(em); m.emissiveIntensity = i || 1; return m; }
  function mesh(geo, m, x, y, z){ var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; return o; }
  function grid(fn, nu, nv){
    var pos = [], idx = [];
    for (var i = 0; i <= nu; i++) for (var j = 0; j <= nv; j++){ var p = fn(i / nu, j / nv); pos.push(p.x, p.y, p.z); }
    for (i = 0; i < nu; i++) for (j = 0; j < nv; j++){ var a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function lathe(pts, m, seg){ var o = mesh(new THREE.LatheGeometry(pts.map(function(q){ return new THREE.Vector2(q[0], q[1]); }), seg || 64), m); return o; }
  function sph(R, s, phi){ return new THREE.Vector3(R * Math.sin(s) * Math.sin(phi), R * Math.cos(s), R * Math.sin(s) * Math.cos(phi)); }

  // ---------- v2 shape helpers ----------
  // a tapered capsule hanging down -y from the origin: top hemisphere r1 at y 0, bottom hemisphere r2 at y -len (profile runs bottom to top for r128)
  function capsule(r1, r2, len, seg){
    var pts = [], k;
    for (k = 8; k >= 0; k--){ var a = -Math.PI / 2 * k / 8; pts.push([r2 * Math.cos(a), -len + r2 * Math.sin(a)]); }
    for (k = 1; k <= 8; k++){ var b = Math.PI / 2 * k / 8; pts.push([r1 * Math.cos(b), r1 * Math.sin(b)]); }
    return new THREE.LatheGeometry(pts.map(function(q){ return new THREE.Vector2(q[0], q[1]); }), seg || 40);
  }
  function catmull(p0, p1, p2, p3, t){ var t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  // sample rows {y, rx, rz, cy} (bottom to top) into a smooth list of the same rows
  function smoothRows(rows, sub){
    var out = [], n = rows.length; sub = sub || 6;
    function g(i, k){ i = Math.max(0, Math.min(n - 1, i)); return rows[i][k] || 0; }
    for (var i = 0; i < n - 1; i++){
      // rows next to a pole (a closing row) interpolate straight, so the spline never pinches a cap inward
      var straight = rows[i].rx < 0.05 || rows[i + 1].rx < 0.05;
      for (var s = 0; s < sub; s++){ var t = s / sub, r;
        if (straight) r = {y:g(i, 'y') + (g(i + 1, 'y') - g(i, 'y')) * t, rx:g(i, 'rx') + (g(i + 1, 'rx') - g(i, 'rx')) * t, rz:g(i, 'rz') + (g(i + 1, 'rz') - g(i, 'rz')) * t, cy:g(i, 'cy') + (g(i + 1, 'cy') - g(i, 'cy')) * t};
        else r = {y:catmull(g(i - 1, 'y'), g(i, 'y'), g(i + 1, 'y'), g(i + 2, 'y'), t), rx:catmull(g(i - 1, 'rx'), g(i, 'rx'), g(i + 1, 'rx'), g(i + 2, 'rx'), t), rz:catmull(g(i - 1, 'rz'), g(i, 'rz'), g(i + 1, 'rz'), g(i + 2, 'rz'), t), cy:catmull(g(i - 1, 'cy'), g(i, 'cy'), g(i + 1, 'cy'), g(i + 2, 'cy'), t)};
        r.rx = Math.max(0.001, r.rx); r.rz = Math.max(0.001, r.rz); out.push(r);
      }
    }
    out.push({y:rows[n - 1].y, rx:Math.max(0.001, rows[n - 1].rx), rz:Math.max(0.001, rows[n - 1].rz), cy:rows[n - 1].cy || 0});
    return out;
  }
  function sgnpow(c, e){ return (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), e); }
  // a smooth tube through rows {y, rx, rz, cy}: superellipse cross-section (n = 2 round, 2.5 softly boxed), pad grows every radius
  function tube(rows, o){
    o = o || {}; var n = o.n || 2.5, pad = o.pad || 0, e = 2 / n, R = smoothRows(rows, o.sub), last = R.length - 1;
    return grid(function(u, v){
      var t = u * Math.PI * 2, i = Math.min(last, Math.floor(v * last)), f = v * last - i, a = R[i], b = R[Math.min(last, i + 1)];
      var rx = a.rx + (b.rx - a.rx) * f + pad, rz = a.rz + (b.rz - a.rz) * f + pad, y = a.y + (b.y - a.y) * f, cy = a.cy + (b.cy - a.cy) * f;
      return new THREE.Vector3(rx * sgnpow(Math.cos(t), e), y, rz * sgnpow(Math.sin(t), e) + cy);
    }, o.seg || 56, R.length - 1);
  }
  // rx, rz, cy of a row list at height y (linear between rows, clamped)
  function rowAt(rows, y){
    var n = rows.length; if (y <= rows[0].y) return rows[0]; if (y >= rows[n - 1].y) return rows[n - 1];
    for (var i = 0; i < n - 1; i++){ if (y >= rows[i].y && y <= rows[i + 1].y){ var f = (y - rows[i].y) / Math.max(1e-6, rows[i + 1].y - rows[i].y);
      return {y:y, rx:rows[i].rx + (rows[i + 1].rx - rows[i].rx) * f, rz:rows[i].rz + (rows[i + 1].rz - rows[i].rz) * f, cy:(rows[i].cy || 0) + ((rows[i + 1].cy || 0) - (rows[i].cy || 0)) * f}; } }
    return rows[n - 1];
  }
  // a rounded loaf lying along +z (heel at -back, toe at +fwd), flat sole at y 0, for feet and shoes
  function loaf(o){
    var L = o.back + o.fwd, e = 2 / (o.n || 2.6);
    return grid(function(u, v){
      var t = v, z = -o.back + t * L, end = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 3.2)), 0.5);
      var w = (o.w(t)) * end, h = o.h(t) * end, s = -u * Math.PI * 2;
      return new THREE.Vector3(w * sgnpow(Math.cos(s), e), h * 0.5 + h * 0.5 * sgnpow(Math.sin(s), e), z);
    }, o.seg || 40, o.len || 30);
  }
  // torso-relative height: f = 0 at the shoulder line, 1 at the t-shirt hem
  function ty(d, f){ return d.top - f * (d.top - d.bottom); }
  W.util = {col:col, mat:mat, glow:glow, mesh:mesh, grid:grid, lathe:lathe, capsule:capsule, tube:tube, rowAt:rowAt, loaf:loaf, smoothRows:smoothRows, ty:ty};

  // ---------- neck and ears ----------
  W.parts['neck.none'] = function(){ return null; };
  W.parts['neck.gold'] = function(c){ return chain(c, '#d9a83c', 0.85, 0.3); };
  W.parts['neck.white'] = function(c){ return chain(c, '#e6e9ee', 0.9, 0.22); };
  W.parts['ears.none'] = function(){ return null; };
  W.parts['ears.diamond'] = function(c){ var g = studs(c, '#ffffff', 0.4, 0.08, 0.08); g.children.forEach(function(o){ o.material.emissive = col('#9fb4ff'); o.material.emissiveIntensity = 0.35; }); return g; };
  W.parts['ears.pearl'] = function(c){ return studs(c, '#f4ecdf', 0.05, 0.3, 0.09); };
  // ---------- hats ----------
  function warp(v){
    var t = THREE.MathUtils.clamp((v.y - 0.15) / 0.85, 0, 1);
    var hr = Math.hypot(v.x, v.z);
    var r = 1.10 * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.3)));
    var k = hr > 1e-6 ? r / hr : 0;
    v.x *= k; v.z *= k;
    v.y = B + t * 0.92 + 0.14 * v.z * t;
  }
  function crownMat(hex){
    var m = mat(hex, 0.93);
    m.side = THREE.DoubleSide;
    m.onBeforeCompile = function(s){
      s.vertexShader = 'varying vec3 vObj;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
      s.fragmentShader = 'varying vec3 vObj;\n' + s.fragmentShader
        .replace('#include <clipping_planes_fragment>', 'if (vObj.z < -0.35 && vObj.y < 0.40 + 0.55 * sqrt(max(0.0, 1.0 - (vObj.x * vObj.x) / 0.3844))) discard;\n#include <clipping_planes_fragment>')
        .replace('#include <color_fragment>', '#include <color_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb *= 0.28;');
    };
    return m;
  }
  function cap(hex){
    var g = new THREE.Group();
    var cloth = mat(hex, 0.93), dark = mat(hex, 0.9, 0.7), plastic = mat(hex, 0.5);
    var R = 1.0, TH = 1.42;
    var geo = new THREE.SphereGeometry(R, 72, 36, 0, Math.PI * 2, 0, TH);
    var p = geo.attributes.position, v = new THREE.Vector3(), apex = new THREE.Vector3(0, -9, 0);
    for (var i = 0; i < p.count; i++){ v.fromBufferAttribute(p, i); warp(v); p.setXYZ(i, v.x, v.y, v.z); if (v.y > apex.y) apex.copy(v); }
    geo.computeVertexNormals();
    g.add(mesh(geo, crownMat(hex)));
    for (var k = 0; k < 6; k++){
      var phi = k * Math.PI / 3, pts = [];
      for (var s = TH; s >= 0.05; s -= 0.08){ var q = sph(R, s, phi); warp(q); pts.push(q.multiplyScalar(1.006)); }
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.012, 6, false), dark));
    }
    for (k = 0; k < 6; k++){
      var e = sph(R, 0.62, Math.PI / 6 + k * Math.PI / 3); warp(e);
      var n = e.clone().sub(new THREE.Vector3(0, 0.1, 0)).normalize();
      var ring = mesh(new THREE.TorusGeometry(0.04, 0.014, 8, 20), dark);
      ring.position.copy(e).addScaledVector(n, 0.006); ring.lookAt(e.clone().addScaledVector(n, 2)); g.add(ring);
    }
    var btn = mesh(new THREE.SphereGeometry(0.085, 20, 14), cloth); btn.position.copy(apex).y += 0.005; btn.scale.set(1, 0.55, 1); g.add(btn);
    var a = 0.98, ri = 1.0, rox = 1.32, roz = 1.95, TK = 0.05;
    function visor(t, s){
      var x = ri * Math.sin(t) + s * (rox - ri) * Math.sin(t), z = ri * Math.cos(t) + s * (roz - ri) * Math.cos(t);
      var d = Math.max(0, Math.hypot(x, z) - ri);
      return new THREE.Vector3(x, B + 0.035 - 0.13 * d - 0.45 * (x * x / (rox * rox)) * d, z);
    }
    var visorM = cloth.clone(); visorM.side = THREE.DoubleSide;
    g.add(mesh(grid(function(u, v){ return visor(-a + 2 * a * u, v); }, 48, 12), visorM));
    g.add(mesh(grid(function(u, v){ var q = visor(-a + 2 * a * u, v); q.y -= TK; return q; }, 48, 12), visorM));
    g.add(mesh(grid(function(u, v){ var q = visor(-a + 2 * a * u, 1); q.y -= TK * v; return q; }, 48, 1), visorM));
    g.add(mesh(grid(function(u, v){ var q = visor(-a, u); q.y -= TK * v; return q; }, 12, 1), visorM));
    g.add(mesh(grid(function(u, v){ var q = visor(a, u); q.y -= TK * v; return q; }, 12, 1), visorM));
    plastic.side = THREE.DoubleSide;
    var band = mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.15, 64, 1, true, Math.PI - 0.95, 1.9), plastic); band.position.y = B + 0.09; g.add(band);
    var spots = [];
    for (k = 0; k < 6; k++) spots.push({th: Math.PI - 0.44 + k * 0.12, hole:true});
    spots.push({th: Math.PI + 0.40, hole:false}); spots.push({th: Math.PI + 0.53, hole:false});
    spots.forEach(function(sp){
      var o = mesh(sp.hole ? new THREE.TorusGeometry(0.026, 0.009, 6, 16) : new THREE.SphereGeometry(0.02, 10, 8), dark);
      o.position.set(1.066 * Math.sin(sp.th), B + 0.09, 1.066 * Math.cos(sp.th)); o.rotation.y = sp.th; g.add(o);
    });
    return g;
  }
  function bucket(hex){
    var g = new THREE.Group();
    var Bb = B + 0.08, H = 0.78;
    var cloth = mat(hex, 0.93); cloth.side = THREE.DoubleSide;
    var dark = mat(hex, 0.9, 0.7);
    var crown = mesh(new THREE.CylinderGeometry(0.94, 1.09, H, 64, 1, false), cloth); crown.position.y = Bb + H / 2; g.add(crown);
    var rimT = mesh(new THREE.TorusGeometry(0.89, 0.05, 10, 96), cloth); rimT.rotation.x = Math.PI / 2; rimT.position.y = Bb + H - 0.05; g.add(rimT);
    var top = mesh(new THREE.TorusGeometry(0.955, 0.008, 6, 96), dark); top.rotation.x = Math.PI / 2; top.position.y = Bb + H - 0.13; g.add(top);
    var foot = mesh(new THREE.TorusGeometry(1.095, 0.009, 6, 96), dark); foot.rotation.x = Math.PI / 2; foot.position.y = Bb + 0.02; g.add(foot);
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function(phi){
      var sub = new THREE.Group(); sub.rotation.y = phi;
      var seam = mesh(new THREE.CylinderGeometry(0.011, 0.011, H - 0.12, 6), dark);
      seam.position.set(0, Bb + H / 2 - 0.05, 1.024); seam.rotation.x = -Math.atan(0.15 / H);
      sub.add(seam); g.add(sub);
    });
    g.add(lathe([[1.05, Bb + 0.03], [1.09, Bb], [1.45, Bb - 0.34], [1.45, Bb - 0.37], [1.05, Bb - 0.03]], cloth, 96));
    [1.15, 1.21, 1.27, 1.33, 1.39].forEach(function(r){
      var y = Bb - (r - 1.09) * (0.34 / 0.36);
      var ring = mesh(new THREE.TorusGeometry(r, 0.0065, 6, 128), dark); ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.004; g.add(ring);
    });
    [1.32, 1.82, -1.32, -1.82].forEach(function(phi){
      var r = 0.99, y = Bb + 0.55;
      var n = new THREE.Vector3(Math.sin(phi), 0.18, Math.cos(phi)).normalize();
      var ring = mesh(new THREE.TorusGeometry(0.04, 0.014, 8, 20), dark);
      ring.position.set(r * Math.sin(phi), y, r * Math.cos(phi)).addScaledVector(n, 0.006);
      ring.lookAt(ring.position.clone().addScaledVector(n, 2)); g.add(ring);
    });
    return g;
  }
  function weave(repU, repV){
    var c = document.createElement('canvas'); c.width = 128; c.height = 128;
    var x = c.getContext('2d');
    x.fillStyle = '#cdb17c'; x.fillRect(0, 0, 128, 128); x.lineWidth = 2;
    x.strokeStyle = 'rgba(110,80,34,0.3)';
    for (var i = -128; i <= 256; i += 8){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); }
    x.strokeStyle = 'rgba(255,246,220,0.3)';
    for (i = -128; i <= 256; i += 8){ x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repU, repV); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  // a brimmed hat: straw (woven) or cloth, brim radius by style, ribbon colour
  function brimHat(o){
    var g = new THREE.Group();
    var crownM = o.straw ? new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.88, metalness:0, map:weave(18, 3), side:THREE.DoubleSide}) : mat(o.cloth, 0.93);
    var brimM  = o.straw ? new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.88, metalness:0, map:weave(28, 2), side:THREE.DoubleSide}) : mat(o.cloth, 0.93);
    crownM.side = brimM.side = THREE.DoubleSide;
    var ribbon = mat(o.ribbon, 0.8); ribbon.side = THREE.DoubleSide;
    g.add(lathe([[1.0, B], [1.05, B + 0.16], [1.03, B + 0.36], [0.93, B + 0.55], [0.72, B + 0.68], [0.42, B + 0.76], [0, B + 0.78]], crownM, 96));
    var band = mesh(new THREE.CylinderGeometry(1.07, 1.075, 0.17, 96, 1, true), ribbon); band.position.y = B + 0.14; g.add(band);
    var R = o.brim, m1 = 1.0 + (R - 1.0) * 0.52, m2 = 1.0 + (R - 1.0) * 0.87;
    var drop = 0.06 + (R - 1.0) * 0.21;
    g.add(lathe([[1.0, B + 0.03], [1.0, B], [m1, B - drop * 0.18], [m2, B - drop * 0.7], [R, B - drop], [R, B - drop - 0.03], [m2, B - drop * 0.7 - 0.03], [m1, B - drop * 0.18 - 0.03], [1.0, B - 0.03]], brimM, 128));
    return g;
  }
  W.parts['head.cap'] = function(c){ return cap(c.colorway || '#232323'); };
  W.parts['head.bucket'] = function(c){ return bucket(c.colorway || '#232323'); };
  W.parts['head.straw'] = function(){ return brimHat({straw:true, brim:1.65, ribbon:'#5c6538'}); };
  W.parts['head.sunhat'] = function(){ return brimHat({straw:true, brim:2.15, ribbon:'#5c6538'}); };
  W.parts['head.gardenhat'] = function(){ return brimHat({straw:false, brim:1.9, cloth:'#5f6a3a', ribbon:'#c48a2f'}); };

  // ---------- garments on the body (v2: everything reads the dims contract) ----------
  // the torso in a garment colour: the body's own garment rows (d.shell) with a little ease
  function shell(c, hex, rough, o){
    var d = c.dims, m = mat(hex, rough || 0.92); m.side = THREE.DoubleSide; o = o || {};
    var rows = d.shell.filter(function(r){ return r.y >= (o.hemY == null ? d.bottom - 0.001 : o.hemY - 0.001); });
    if (o.hemY != null && rows[0].y > o.hemY + 0.01){ var r0 = rowAt(d.shell, o.hemY); rows.unshift({y:o.hemY, rx:r0.rx, rz:r0.rz, cy:r0.cy}); }
    return mesh(tube(rows, {n:d.n, pad:o.pad || 0.02}), m);
  }
  // a sleeve in arm space: short = the body's own sleeve length, long = to just above the wrist
  function sleeve(c, i, hex, len){
    var d = c.dims, L = len === 'long' ? d.upper + d.fore - 0.35 : d.sleeve, m = mat(hex, 0.92), P = d.sleevePad || 0.17, r1 = d.upperR + P, r2 = d.upperR + P - 0.04, D = d.sleeveDome || 0.36;
    var s = mesh(tube([{y:-L - 0.02, rx:0.02, rz:0.02}, {y:-L, rx:r2, rz:r2}, {y:-L * 0.6, rx:r2 + 0.01, rz:r2 + 0.01}, {y:0, rx:r1 + 0.02, rz:r1}, {y:D * 0.5, rx:r1 * 0.92, rz:r1 * 0.9}, {y:D * 0.83, rx:r1 * 0.62, rz:r1 * 0.62}, {y:D, rx:0.02, rz:0.02}], {n:2.2, sub:4, seg:40}), m); c.arms[i].add(s);
    return s;
  }
  function collar(c, hex){ var d = c.dims, o = mesh(new THREE.TorusGeometry(d.neckR + 0.1, 0.035, 8, 48), mat(hex, 0.9), 0, d.collarY - 0.06, 0); o.rotation.x = Math.PI / 2; return o; }

  // a sheet hugging the front of the garment carrying a canvas texture (prints)
  function gridUV(fn, nu, nv){
    var pos = [], uv = [], idx = [];
    for (var i = 0; i <= nu; i++) for (var j = 0; j <= nv; j++){ var p = fn(i / nu, j / nv); pos.push(p.x, p.y, p.z); uv.push(i / nu, j / nv); }
    for (i = 0; i < nu; i++) for (j = 0; j < nv; j++){ var a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function surfZ(d, x, y, out){ var r = rowAt(d.shell, y), q = Math.min(1, Math.abs(x) / (r.rx + 0.02)); return (r.rz + 0.02) * Math.pow(Math.max(0, 1 - Math.pow(q, d.n)), 1 / d.n) + (r.cy || 0) + (out || 0); }
  function printSheet(c, tex, width, y0, y1){
    var d = c.dims, m = new THREE.MeshStandardMaterial({map:tex, transparent:true, roughness:0.9, metalness:0, depthWrite:false}); m.side = THREE.DoubleSide;
    var o = mesh(gridUV(function(u, v){ var y = y0 + v * (y1 - y0), x = (u - 0.5) * width; return new THREE.Vector3(x, y, surfZ(d, x, y, 0.04)); }, 24, 16), m); o.castShadow = false; return o;
  }
  var TEX = {};
  function textTexture(key, draw){
    if (TEX[key]) return TEX[key];
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 384; var g = cv.getContext('2d'); g.clearRect(0, 0, 512, 384); draw(g);
    var t = new THREE.CanvasTexture(cv); t.anisotropy = 4; t.needsUpdate = true; TEX[key] = t; return t;
  }
  function wordTexture(word, ufo){
    return textTexture(word + (ufo ? '+ufo' : ''), function(g){
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 118px "Helvetica Neue", Helvetica, Arial, sans-serif';
      if (ufo){
        g.fillText(word, 256, 250);
        // a small saucer above the word
        g.beginPath(); g.ellipse(256, 128, 92, 22, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(256, 104, 44, 30, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#232323'; [-52, 0, 52].forEach(function(dx){ g.beginPath(); g.arc(256 + dx, 132, 7, 0, Math.PI * 2); g.fill(); });
      } else g.fillText(word, 256, 192);
    });
  }
  // a hood lying down on the back and shoulders
  function hood(c, hex){
    var d = c.dims, g = new THREE.Group(), m = mat(hex, 0.92), y = d.collarY - 0.05, back = -(d.chestRz + 0.04);
    var bag = mesh(new THREE.SphereGeometry(1, 32, 20), m, 0, y - 0.22, back - 0.12); bag.scale.set(d.neckR + 0.62, 0.42, 0.5); g.add(bag);
    var ring = mesh(new THREE.TorusGeometry(d.neckR + 0.24, 0.16, 12, 48, Math.PI * 1.35), m, 0, y + 0.02, 0); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI * 0.325; g.add(ring);
    return g;
  }
  function drawstrings(c, hex){
    var d = c.dims, g = new THREE.Group(), m = mat(hex, 0.8);
    [-1, 1].forEach(function(s){ var y0 = d.collarY - 0.1, L = 0.9, x = s * 0.22, str = mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 8), m, x, y0 - L / 2, surfZ(d, x, y0 - L / 2, 0.05)); g.add(str); g.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), m, x, y0 - L, surfZ(d, x, y0 - L, 0.05))); });
    return g;
  }
  function stripeColour(hex){ return hex.toLowerCase() === '#f0efec' ? '#232323' : '#f3f1eb'; }
  // a chain lying on the shirt: round the back of the neck and dipping to a V on the chest
  function chain(c, hex, metalness, rough){
    var d = c.dims, pts = [], n = 40, R = d.neckR + 0.16, m = new THREE.MeshStandardMaterial({color:col(hex), metalness:metalness, roughness:rough});
    for (var i = 0; i < n; i++){ var a = (i / n) * Math.PI * 2 - Math.PI, f = (Math.cos(a) + 1) / 2, dip = Math.pow(f, 2.6), y = d.collarY - 0.1 - 0.95 * dip, x = (R + 0.3 * f) * Math.sin(a);
      var behind = Math.abs(a) > Math.PI / 2, z = behind ? -surfZ(d, x, Math.min(y, d.collarY - 0.12), 0.05) + 0.02 : surfZ(d, x, Math.min(y, d.collarY - 0.12), 0.06);
      pts.push(new THREE.Vector3(x, y, z)); }
    var o = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.042, 8, true), m); o.castShadow = false; return o;
  }
  function studs(c, hex, metalness, rough, r){
    var g = new THREE.Group(), m = new THREE.MeshStandardMaterial({color:col(hex), metalness:metalness, roughness:rough});
    [-1, 1].forEach(function(s){ var o = mesh(new THREE.SphereGeometry(r, 14, 10), m, s * 1.08, -0.24, 0.05); o.castShadow = false; o.receiveShadow = false; g.add(o); });
    return g;
  }
  // a sheet hugging the front of the garment between two heights
  function frontSheet(c, hex, width, y0, y1, out, x0){
    var d = c.dims, e = 2 / d.n, m = mat(hex, 0.9); m.side = THREE.DoubleSide;
    var o = mesh(grid(function(u, v){
      var y = y0 + v * (y1 - y0), r = rowAt(d.shell, y), x = (x0 || 0) + (u - 0.5) * width;
      var q = Math.min(1, Math.abs(x) / (r.rx + 0.02)), z = (r.rz + 0.02) * Math.pow(Math.max(0, 1 - Math.pow(q, d.n)), 1 / d.n) + (r.cy || 0) + (out || 0.05);
      return new THREE.Vector3(x, y, z);
    }, 16, 18), m);
    o.receiveShadow = false; return o;
  }
  // a strap over one shoulder: a short arc over the top, a strip down the chest
  function strap(c, hex, x){
    var d = c.dims, S = d.S, g = new THREE.Group();
    var arc = mesh(new THREE.TorusGeometry(0.55 * S, 0.07 * S, 8, 40, Math.PI), mat(hex, 0.9), x, d.top - 0.5 * S, 0);
    arc.rotation.y = Math.PI / 2; arc.scale.z = 0.75; g.add(arc);
    g.add(frontSheet(c, hex, 0.16 * S, d.top - 0.05, d.top - 1.55 * S, 0.06, x));
    return g;
  }
  function pocket(c, hex, x, y, w, h){ return frontSheet(c, hex, w, y, y - h, 0.09, x); }
  W.parts['torso.tee'] = function(c){ var hex = c.colorway || '#f3f1eb', rib = '#' + col(hex).lerp(col('#000000'), 0.08).getHexString(), g = new THREE.Group(); g.add(shell(c, hex)); sleeve(c, 0, hex); sleeve(c, 1, hex); g.add(collar(c, rib)); return g; };
  W.parts['torso.scrubs'] = function(c){ var g = new THREE.Group(), d = c.dims, S = d.S; g.add(shell(c, '#6aa2a0')); sleeve(c, 0, '#6aa2a0'); sleeve(c, 1, '#6aa2a0'); g.add(collar(c, '#5d918f')); g.add(pocket(c, '#5d918f', -0.55 * S, ty(d, 0.4), 0.55 * S, 0.5 * S)); return g; };
  W.parts['torso.track'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S, hex = c.colorway || '#1f2a44', st = stripeColour(hex); g.add(shell(c, hex, 0.85));
    [0, 1].forEach(function(i){ sleeve(c, i, hex, 'long');
      [0.14, -0.14].forEach(function(dx){ var L = d.upper + d.fore - 0.45; var s = mesh(new THREE.BoxGeometry(0.07, L, 0.03), mat(st, 0.9), dx * S, -L / 2 + 0.05, d.upperR + 0.2); c.arms[i].add(s); }); });
    g.add(frontSheet(c, '#8b93a6', 0.06, ty(d, 0.06), ty(d, 0.96), 0.07));
    var cl = mesh(new THREE.CylinderGeometry(d.neckR + 0.12, d.neckR + 0.18, 0.3, 40, 1, true), mat(hex, 0.85), 0, d.collarY + 0.02, 0); cl.material.side = THREE.DoubleSide; g.add(cl);
    return g;
  };
  W.parts['torso.zip'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S, hex = c.colorway || '#232323', dark = '#' + col(hex).lerp(col('#000000'), 0.08).getHexString();
    g.add(shell(c, hex, 0.95)); [0, 1].forEach(function(i){ sleeve(c, i, hex, 'long'); });
    g.add(hood(c, hex)); g.add(frontSheet(c, '#9a9a94', 0.05, ty(d, 0.02), ty(d, 0.98), 0.07));
    g.add(pocket(c, hex, -0.62 * S, ty(d, 0.2), 0.7 * S, 0.62 * S)); g.add(pocket(c, hex, 0.62 * S, ty(d, 0.2), 0.7 * S, 0.62 * S));
    return g;
  };
  W.parts['torso.hoodie'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S, hex = c.colorway || '#232323', dark = '#' + col(hex).lerp(col('#000000'), 0.18).getHexString();
    g.add(shell(c, hex, 0.95)); [0, 1].forEach(function(i){ sleeve(c, i, hex, 'long'); });
    g.add(hood(c, hex)); g.add(drawstrings(c, '#e8e6e0'));
    g.add(pocket(c, hex, 0, ty(d, 0.24), 1.5 * S, 0.5 * S));
    return g;
  };
  function printedTee(c, word, ufo){ var g = new THREE.Group(), d = c.dims, hex = '#232323'; g.add(shell(c, hex)); sleeve(c, 0, hex); sleeve(c, 1, hex); g.add(collar(c, '#2c2c2c')); g.add(printSheet(c, wordTexture(word, ufo), 1.55 * d.S, ty(d, 0.56), ty(d, 0.06))); return g; }
  W.parts['torso.pizza'] = function(c){ return printedTee(c, 'PIZZA', false); };
  W.parts['torso.alien'] = function(c){ return printedTee(c, 'ALIEN', true); };
  W.parts['torso.apron'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S; g.add(shell(c, '#f3f1eb')); sleeve(c, 0, '#f3f1eb'); sleeve(c, 1, '#f3f1eb'); g.add(collar(c, '#eceae3'));
    g.add(frontSheet(c, '#7a6a55', 1.55 * S, ty(d, 0.17), d.bottom - 0.35 * S, 0.08));
    g.add(pocket(c, '#6c5d4a', 0, ty(d, 0.66), 0.9 * S, 0.55 * S));
    var loop = mesh(new THREE.TorusGeometry(d.neckR + 0.12, 0.035, 8, 40), mat('#7a6a55', 0.9), 0, d.collarY + 0.1, 0); loop.rotation.x = Math.PI / 2; g.add(loop);
    return g;
  };
  W.parts['torso.field'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S; g.add(shell(c, '#6f7a4d')); sleeve(c, 0, '#6f7a4d', 'long'); sleeve(c, 1, '#6f7a4d', 'long');
    g.add(frontSheet(c, '#657045', 0.1, ty(d, 0.05), d.bottom, 0.06));
    g.add(pocket(c, '#657045', -0.5 * S, ty(d, 0.36), 0.5 * S, 0.45 * S)); g.add(pocket(c, '#657045', 0.5 * S, ty(d, 0.36), 0.5 * S, 0.45 * S));
    [-1, 1].forEach(function(s){ var f = mesh(new THREE.BoxGeometry(0.42 * S, 0.04, 0.5 * S), mat('#6f7a4d', 0.9), s * 0.3 * S, d.collarY + 0.02, 0.35 * S); f.rotation.z = s * 0.35; f.rotation.x = 0.25; g.add(f); });
    return g;
  };
  W.parts['torso.overalls'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S; g.add(shell(c, '#f3f1eb')); sleeve(c, 0, '#f3f1eb'); sleeve(c, 1, '#f3f1eb'); g.add(collar(c, '#eceae3'));
    g.add(frontSheet(c, '#4a5e80', 1.3 * S, ty(d, 0.24), d.bottom - 0.3 * S, 0.08));
    g.add(pocket(c, '#405273', 0, ty(d, 0.34), 0.6 * S, 0.45 * S));
    g.add(strap(c, '#4a5e80', -0.5 * S)); g.add(strap(c, '#4a5e80', 0.5 * S));
    var r = rowAt(d.shell, ty(d, 0.86)), waist = mesh(new THREE.TorusGeometry(r.rx + 0.08, 0.08 * S, 8, 48), mat('#4a5e80', 0.9), 0, ty(d, 0.86), 0); waist.rotation.x = Math.PI / 2; waist.scale.set(1, (r.rz + 0.08) / (r.rx + 0.08), 1); g.add(waist);
    return g;
  };

  W.garment = {shell:shell, sleeve:sleeve, collar:collar, frontSheet:frontSheet, strap:strap, pocket:pocket};

  // ---------- legs and feet (leg space: hip joint at the origin, the leg hangs down -y; the seat sits in root space) ----------
  function pants(c, hex, len){
    var d = c.dims, P = d.pants, m = mat(hex, 0.92), g = new THREE.Group();
    // the seat: a closed tube around the pelvis from the trouser waist down to the crotch
    var rz = 0; for (var q = P.crotchY; q <= P.waistY; q += 0.1) rz = Math.max(rz, rowAt(d.body, q).rz); var rzw = Math.min(rz, rowAt(d.body, P.waistY).rz + 0.1) + 0.2; rz += P.pad || 0.3; var cap = d.chestRz + (d.chestCy || 0) - 0.03; rz = Math.min(rz, cap); rzw = Math.min(rzw, cap);
    g.add(mesh(tube([{y:P.crotchY - 0.5, rx:0.02, rz:0.02}, {y:P.crotchY - 0.47, rx:P.crotchR * 0.55, rz:rz * 0.5}, {y:P.crotchY - 0.32, rx:P.crotchR * 0.86, rz:rz * 0.84}, {y:P.crotchY - 0.12, rx:P.crotchR * 0.98, rz:rz * 0.97}, {y:P.crotchY + 0.2, rx:P.crotchR, rz:rz}, {y:(P.crotchY + P.waistY) / 2, rx:P.hipR, rz:(rz + rzw) / 2}, {y:P.waistY, rx:P.waistR, rz:rzw}, {y:P.waistY + 0.16, rx:P.waistR - 0.05, rz:rzw - 0.04}, {y:P.waistY + 0.2, rx:0.02, rz:0.02}], {n:d.n, sub:5}), m));
    [0, 1].forEach(function(i){
      var hem = len === 'short' ? -d.thigh * 0.55 : P.hemY, r = P.r;
      var leg = mesh(tube([{y:hem, rx:r[2], rz:r[2]}, {y:-d.thigh, rx:r[1], rz:r[1]}, {y:-d.thigh * 0.5, rx:r[0], rz:r[0]}, {y:0.45, rx:r[0] + 0.02, rz:r[0] + 0.02}, {y:0.5, rx:0.02, rz:0.02}], {n:2.2, sub:4, seg:40}), m);
      c.legs[i].add(leg);
      if (len === 'short'){ var cuff = mesh(tube([{y:hem - 0.02, rx:0.02, rz:0.02}, {y:hem, rx:r[2] + 0.02, rz:r[2] + 0.02}, {y:hem + 0.15, rx:r[2] + 0.03, rz:r[2] + 0.03}], {n:2.2, sub:2, seg:40}), m); c.legs[i].add(cuff); }
      else { var end = mesh(tube([{y:hem - 0.01, rx:0.02, rz:0.02}, {y:hem, rx:r[2], rz:r[2]}], {n:2.2, sub:2, seg:40}), m); c.legs[i].add(end); }
    });
    return g;
  }
  W.parts['legs.trousers'] = function(c){ return pants(c, c.colorway || '#f3f1eb'); };
  W.parts['legs.scrubpant'] = function(c){ return pants(c, '#6aa2a0'); };
  W.parts['legs.track'] = function(c){
    var d = c.dims, P = d.pants, hex = c.colorway || '#1f2a44', st = stripeColour(hex), g = pants(c, hex);
    [0, 1].forEach(function(i){ var side = i === 0 ? -1 : 1, top = P.crotchY + 0.15, L = top - P.hemY - 0.05; [0.09, -0.09].forEach(function(dz){ var s = mesh(new THREE.BoxGeometry(0.03, L, 0.06), mat(st, 0.9), side * (P.r[0] + 0.02), top - L / 2, dz); c.legs[i].add(s); }); });
    return g;
  };
  W.parts['legs.shorts'] = function(c){ return pants(c, '#c9b48a', 'short'); };
  W.parts['legs.work'] = function(c){ var g = pants(c, '#6b5238'), S = c.dims.S; c.legs.forEach(function(l){ l.add(mesh(new THREE.BoxGeometry(0.34 * S, 0.4 * S, 0.06), mat('#5e4731', 0.9), 0.32 * S, -0.9 * S, c.dims.pants.r[0] + 0.02)); }); return g; };
  W.parts['legs.denim'] = function(c){ return pants(c, '#4a6a9c'); };
  // the foot loaf on the sole plane in leg space
  function plant(m, c, i){ var side = i === 0 ? -1 : 1; m.rotation.z = -side * (c.dims.splay || 0); m.rotation.y = side * (c.dims.toeYaw || 0); return m; }
  function footLoaf(d, pad, hUp){
    var F = d.foot, w0 = F.w / 2 + pad;
    return loaf({back:F.back + pad, fwd:F.fwd + pad, w:function(t){ return w0 * (0.82 + 0.28 * Math.sin(Math.PI * Math.min(1, t * 1.15))); }, h:function(t){ return (F.h + (hUp || 0)) * (1 - 0.32 * Math.pow(Math.max(0, t - 0.45) / 0.55, 1.6)); }, n:2.6});
  }
  function foot(c, i, hex, o){
    var d = c.dims, y = -(d.thigh + d.shin) - d.foot.ankleUp, g = c.legs[i], sole = o && o.sole;
    g.add(plant(mesh(footLoaf(d, 0.04, 0.02), mat(hex, o && o.rough || 0.85), 0, y + (sole ? 0.14 : 0), 0), c, i));
    if (sole) g.add(plant(mesh(footLoaf(d, 0.09, -d.foot.h + 0.26), mat(sole, 0.8), 0, y, 0), c, i));
    if (o && o.shaft){ var H = o.shaft * d.shin, r = d.shinR2; g.add(mesh(tube([{y:y + 0.2, rx:r + 0.26, rz:r + 0.3, cy:0.05}, {y:y + H * 0.5, rx:r + 0.2, rz:r + 0.22}, {y:y + H, rx:r + 0.18, rz:r + 0.2}, {y:y + H + 0.1, rx:r + 0.14, rz:r + 0.16}, {y:y + H + 0.14, rx:0.02, rz:0.02}], {n:2.2, sub:3, seg:40}), mat(hex, o.rough || 0.85))); }
  }
  W.parts['feet.bare'] = function(c){ [0, 1].forEach(function(i){ var d = c.dims, y = -(d.thigh + d.shin) - d.foot.ankleUp; c.legs[i].add(plant(mesh(footLoaf(d, 0, -0.02), mat(c.skin, 0.85), 0, y, 0), c, i)); }); return null; };
  W.parts['feet.boots'] = function(c){ [0, 1].forEach(function(i){ foot(c, i, '#4f5b3b', {shaft:0.72, rough:0.6}); }); return null; };
  W.parts['feet.mud'] = function(c){ [0, 1].forEach(function(i){ var d = c.dims; foot(c, i, '#5a3f2b', {shaft:0.95, rough:0.6}); var band = mesh(new THREE.TorusGeometry(d.shinR2 + 0.24, 0.035, 8, 40), mat('#3f2b1c', 0.8), 0, -(d.thigh + d.shin) - d.foot.ankleUp + 0.82 * d.shin, 0); band.rotation.x = Math.PI / 2; c.legs[i].add(band); }); return null; };
  W.parts['feet.sneakers'] = function(c){ var hex = c.colorway || '#f4f4f2'; [0, 1].forEach(function(i){ var d = c.dims, y = -(d.thigh + d.shin) - d.foot.ankleUp; foot(c, i, hex, {sole:'#e2ded4', rough:0.7});
    var line = plant(mesh(footLoaf(d, 0.1, -d.foot.h + 0.05), mat('#3f7a47', 0.7), 0, y + 0.16, 0), c, i); c.legs[i].add(line);
    c.legs[i].add(mesh(tube([{y:y + d.foot.h - 0.1, rx:d.shinR2 + 0.12, rz:d.shinR2 + 0.16, cy:0.04}, {y:y + d.foot.h + 0.12, rx:d.shinR2 + 0.11, rz:d.shinR2 + 0.14, cy:0.04}, {y:y + d.foot.h + 0.15, rx:0.02, rz:0.02, cy:0.04}], {n:2.2, sub:2, seg:40}), mat(hex, 0.7))); }); return null; };

  W.garment.pants = pants; W.garment.foot = foot; W.garment.footLoaf = footLoaf;

  // ---------- things in hand (arm space: the group sits in the palm of the right hand, scaled with the body) ----------
  function inHand(c, build){ var d = c.dims, g = new THREE.Group(); g.position.set(0.12 * d.S, -(d.upper + d.fore) - d.hand * 0.55, d.handT * 0.5 + 0.12); g.scale.setScalar(d.S); build(g); c.arms[1].add(g); return null; }
  W.parts['hands.can'] = function(c){ return inHand(c, function(g){
    var tin = mat('#5f7a4a', 0.55);
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.9, 32), tin, 0.15, -0.72, 0.1));
    var sp = mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.3, 12), tin, 0.8, -0.32, 0.1); sp.rotation.z = -0.9; g.add(sp);
    g.add(mesh(new THREE.ConeGeometry(0.2, 0.2, 16), tin, 1.33, 0.16, 0.1)).rotation.z = -0.9;
    var h = mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 32, Math.PI), tin, 0.15, -0.28, 0.1); h.rotation.y = Math.PI / 2; g.add(h);
  }); };
  W.parts['hands.chainsaw'] = function(c){ return inHand(c, function(g){
    g.add(mesh(new THREE.BoxGeometry(0.75, 0.5, 0.42), mat('#c94b2a', 0.6), 0.1, -0.35, 0.1));
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.14, 0.05), mat('#8a8d90', 0.4), 1.05, -0.35, 0.1));
    g.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24), mat('#2a2a2a', 0.7), -0.25, -0.1, 0.1)).rotation.y = Math.PI / 2;
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat('#2a2a2a', 0.7), 0.4, 0, 0.1));
  }); };
  W.parts['hands.launcher'] = function(c){ return inHand(c, function(g){
    var blue = mat('#3f78c9', 0.5);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.5, 20), blue, 0.65, -0.2, 0.1)).rotation.z = Math.PI / 2;
    g.add(mesh(new THREE.SphereGeometry(0.34, 24, 16), mat('#8fc4ee', 0.35), -0.15, -0.15, 0.1));
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.45, 0.16), mat('#2a2a2a', 0.7), 0.25, -0.5, 0.1));
  }); };
  W.parts['hands.bubbles'] = function(c){ return inHand(c, function(g){
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 20), mat('#e77fb0', 0.4), 0.1, -0.35, 0.1));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), mat('#f5c1da', 0.6), 0.35, 0.1, 0.1)).rotation.z = -0.35;
    g.add(mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 24), mat('#f5c1da', 0.6), 0.58, 0.45, 0.1)).rotation.x = 0.4;
    [0.2, 0.32, 0.22].forEach(function(r, i){ var b = mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshStandardMaterial({color:col('#dff3ff'), roughness:0.2, metalness:0, transparent:true, opacity:0.45}), 1.0 + i * 0.55, 0.75 + i * 0.45, 0.2 * i); b.castShadow = false; g.add(b); });
  }); };

  W.garment.inHand = inHand;

  // ---------- packs on the back (root space, scaled with the body) ----------
  function packBase(c, o){
    var g = new THREE.Group(), d = c.dims, S = d.S, y = d.top - 1.45 * S, z = -d.chestRz - 0.42 * S;
    var body = mat(o.body, o.rough || 0.85);
    g.add(mesh(new THREE.BoxGeometry(1.5 * S, 1.85 * S, 0.72 * S), body, 0, y, z));
    g.add(mesh(new THREE.BoxGeometry(1.56 * S, 0.52 * S, 0.8 * S), mat(o.flap || o.body, 0.85), 0, y + 0.72 * S, z - 0.02 * S));
    g.add(mesh(new THREE.BoxGeometry(0.9 * S, 0.55 * S, 0.16 * S), mat(o.pocket || o.flap || o.body, 0.85), 0, y - 0.45 * S, z - 0.44 * S));
    if (o.buckle) g.add(mesh(new THREE.BoxGeometry(0.22 * S, 0.16 * S, 0.06 * S), o.buckle, 0, y + 0.42 * S, z - 0.44 * S));
    g.add(strap(c, o.straps || o.body, -0.55 * S)); g.add(strap(c, o.straps || o.body, 0.55 * S));
    g.userData.y = y; g.userData.z = z; g.userData.S = S; return g;
  }
  // the decorated packs draw their emblems in a sub-group scaled with the body
  function emblem(g, fn){ var e = new THREE.Group(); e.position.set(0, g.userData.y, g.userData.z); e.scale.setScalar(g.userData.S); fn(e); g.add(e); return g; }
  W.parts['back.pack_basic'] = function(c){ return packBase(c, {body:'#b6a07a', flap:'#5f6a3a', pocket:'#5f6a3a', straps:'#5a4a38', buckle:mat('#c9a24c', 0.35)}); };
  W.parts['back.pack_ivory'] = function(c){ return packBase(c, {body:'#efe6d6', flap:'#3d6b4a', pocket:'#efe6d6', straps:'#3d6b4a', buckle:mat('#d4b25a', 0.3), rough:0.6}); };
  W.parts['back.pack_sun'] = function(c){ return emblem(packBase(c, {body:'#141414', flap:'#141414', pocket:'#1c1c1c', straps:'#1c1c1c', rough:0.55}), function(e){
    var gold = mat('#d8b24f', 0.3);
    e.add(mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 40), gold, 0, 0.05, -0.38));
    for (var i = 0; i < 8; i++){ var sp = mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), gold, Math.sin(i * Math.PI / 4) * 0.44, 0.05 + Math.cos(i * Math.PI / 4) * 0.44, -0.38); sp.rotation.z = -i * Math.PI / 4; e.add(sp); }
    var core = mesh(new THREE.SphereGeometry(0.16, 20, 14), glow('#ffd27a', '#ffb347', 1.4), 0, 0.05, -0.4); core.castShadow = false; e.add(core);
  }); };
  W.parts['back.pack_neon'] = function(c){ return emblem(packBase(c, {body:'#b2286f', flap:'#8f1e58', pocket:'#8f1e58', straps:'#4a1230', rough:0.45}), function(e){
    var rail = glow('#ff7fc4', '#ff4fa8', 1.6);
    [-0.7, 0.7].forEach(function(x){ var r = mesh(new THREE.BoxGeometry(0.06, 1.7, 0.06), rail, x, 0, -0.38); r.castShadow = false; e.add(r); });
    var t = mesh(new THREE.SphereGeometry(0.2, 20, 14), glow('#ffb6dc', '#ff6fb8', 1.5), 0, 0.15, -0.45); t.scale.set(0.8, 1.2, 0.6); t.castShadow = false; e.add(t);
  }); };
  W.parts['back.pack_cyber'] = function(c){ return emblem(packBase(c, {body:'#1a1d22', flap:'#1a1d22', pocket:'#23272e', straps:'#23272e', rough:0.5}), function(e){
    var cyan = glow('#7fe8f8', '#33d6f0', 1.6);
    [[-0.72, 0, 0.06, 1.75], [0.72, 0, 0.06, 1.75], [0, 0.95, 1.5, 0.06]].forEach(function(p){ var r = mesh(new THREE.BoxGeometry(p[2], p[3], 0.05), cyan, p[0], p[1], -0.39); r.castShadow = false; e.add(r); });
    var sc = mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), glow('#7dff9a', '#3cff6a', 1.4), 0, 0.15, -0.47); sc.castShadow = false; e.add(sc);
  }); };
  W.parts['back.pack_starlight'] = function(c){ return emblem(packBase(c, {body:'#1c2a55', flap:'#16214a', pocket:'#16214a', straps:'#16214a', rough:0.6}), function(e){
    for (var i = 0; i < 14; i++){ var s = mesh(new THREE.SphereGeometry(0.025, 8, 6), glow('#ffffff', '#ffffff', 1.2), (Math.sin(i * 2.3) * 0.6), Math.cos(i * 1.7) * 0.75, -0.37); s.castShadow = false; e.add(s); }
    var dome = mesh(new THREE.SphereGeometry(0.32, 24, 16), new THREE.MeshStandardMaterial({color:col('#cfe6ff'), roughness:0.1, metalness:0, transparent:true, opacity:0.35}), 0, 0.2, -0.55); dome.castShadow = false; e.add(dome);
    var fl = mesh(new THREE.SphereGeometry(0.13, 16, 12), glow('#9fd0ff', '#4aa8ff', 1.8), 0, 0.25, -0.55); fl.castShadow = false; e.add(fl);
    e.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), mat('#3d6b4a', 0.8), 0, 0.05, -0.55));
  }); };

  W.garment.packBase = packBase;

  // ---------- things bolted on (root space, scaled with the body) ----------
  W.parts['attach.rocket'] = function(c){
    var g = new THREE.Group(), d = c.dims, S = d.S, e = new THREE.Group(); e.position.set(0, d.top - 1.45 * S, -d.chestRz - (0.42 + 0.62) * S); e.scale.setScalar(S); g.add(e);
    var steel = mat('#cfd3d8', 0.35), red = mat('#c8362b', 0.6), dark = mat('#2a2a2a', 0.7);
    [-0.42, 0.42].forEach(function(x){
      e.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.5, 24), steel, x, 0, 0));
      e.add(mesh(new THREE.ConeGeometry(0.27, 0.42, 24), red, x, 0.96, 0));
      e.add(mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.25, 24), dark, x, -0.85, 0));
    });
    e.add(mesh(new THREE.BoxGeometry(1.1, 0.16, 0.2), dark, 0, 0.3, 0.3));
    return g;
  };

  // ---------- toppers (head space) ----------
  W.parts['topper.kite'] = function(c){
    var g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), mat('#8a6a3a', 0.8), 0.35, 1.95, -0.1));
    var kite = mesh(new THREE.PlaneGeometry(0.8, 0.8), mat('#c8362b', 0.8), 0.35, 2.75, -0.1); kite.material.side = THREE.DoubleSide; kite.rotation.z = Math.PI / 4; kite.rotation.x = -0.25; kite.scale.set(1, 1.25, 1); g.add(kite);
    var inner = mesh(new THREE.PlaneGeometry(0.36, 0.36), mat('#f1e9d2', 0.8), 0.35, 2.75, -0.08); inner.material.side = THREE.DoubleSide; inner.rotation.z = Math.PI / 4; inner.rotation.x = -0.25; inner.scale.set(1, 1.25, 1); g.add(inner);
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), mat('#f1e9d2', 0.9), 0.35, 2.0, -0.25)).rotation.x = 0.15;
    return g;
  };
  W.parts['topper.bloom'] = function(c){
    var g = new THREE.Group(), pink = mat('#e07a9b', 0.85), deep = mat('#c85e83', 0.85);
    var at = new THREE.Vector3(-0.96, 0.32, 0.12);
    [[0, 0, 0, 0.2], [0.14, 0.12, 0.06, 0.15], [-0.1, 0.16, 0.08, 0.14], [0.02, -0.15, 0.12, 0.15], [-0.14, -0.06, 0.1, 0.13], [0.12, -0.02, 0.16, 0.12]].forEach(function(p, i){ g.add(mesh(new THREE.SphereGeometry(p[3], 16, 12), i % 2 ? deep : pink, at.x + p[0], at.y + p[1], at.z + p[2])); });
    var leaf = mesh(new THREE.SphereGeometry(0.16, 12, 8), mat('#5f8a4a', 0.9), at.x - 0.05, at.y - 0.22, at.z - 0.05); leaf.scale.set(1.4, 0.4, 0.8); g.add(leaf);
    return g;
  };
})();
