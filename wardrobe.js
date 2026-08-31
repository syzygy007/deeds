/* DEEDS wardrobe · every part the avatar can wear, drawn in geometry on a unit head (radius 1 at the origin).
   window.Wardrobe.parts[item_id] = function(ctx) returns a THREE.Group to add at the figure root, or null.
   ctx: { dims (body measurements), arms [left, right groups: shoulder at the origin, the arm hangs down -y],
          legs [left, right groups: hip at the origin], skin (hex), hair (hex), colorway (hex or null) }
   Add a garment: one builder per catalog id. Nothing here talks to the server. */
(function(){
  var W = window.Wardrobe = { B: 0.40, parts: {}, colorways: {}, skins: {}, hairs: {}, defaultColorway: {} };
  var B = W.B;

  W.skins = {'skin.s1':'#f6e3d3','skin.s2':'#eed0b8','skin.s3':'#e3ba9c','skin.s4':'#d9a377','skin.s5':'#c48a5d','skin.s6':'#a56b45','skin.s7':'#7d4c30','skin.s8':'#56331f','skin.moss':'#7f9a63','skin.teal':'#5f9c9a','skin.lilac':'#b39ad0','skin.clay':'#c4714f'};
  W.hairs = {'hair.h1':'#1e1b18','hair.h2':'#4a3223','hair.h3':'#6b3f24','hair.h4':'#cbb17a','hair.h5':'#a5522a','hair.h6':'#9a9a94','hair.h7':'#6a7f4a','hair.h8':'#6a3a5c'};
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
  W.util = {col:col, mat:mat, glow:glow, mesh:mesh, grid:grid, lathe:lathe};

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

  // ---------- garments on the body ----------
  // the torso in a garment colour, a hair wider than the skin
  function shell(c, hex, rough){
    // profile runs bottom to top: r128 LatheGeometry winds a top to bottom profile inside out (normals inward), which culled the whole torso from the front
    var d = c.dims, o = lathe([[d.hips * 0.93, d.bottom - 0.02], [d.hips + 0.06, d.top - 2.55], [d.waist + 0.06, d.top - 1.95], [d.chest + 0.06, d.top - 0.98], [d.shoulder + 0.1, d.top - 0.42], [0.95, d.top]], mat(hex, rough || 0.92), 48);
    o.scale.z = d.depth; return o;
  }
  function sleeve(c, i, hex, len){
    var d = c.dims, L = len === 'long' ? d.upper + d.fore - 0.25 : 1.0, m = mat(hex, 0.92);
    var s = mesh(new THREE.CylinderGeometry(d.upperR + 0.06, d.upperR + 0.03, L, 24), m, 0, -L / 2 + 0.05, 0); c.arms[i].add(s);
    c.arms[i].add(mesh(new THREE.SphereGeometry(d.upperR + 0.07, 20, 14), m, 0, 0.02, 0));
    return s;
  }
  function collar(c, hex){ var d = c.dims, o = mesh(new THREE.TorusGeometry(0.52, 0.07, 10, 48), mat(hex, 0.9), 0, d.top + 0.02, 0); o.rotation.x = Math.PI / 2; return o; }
  // a sheet hugging the front of the torso between two heights
  function frontSheet(c, hex, width, y0, y1, out, x0){
    var d = c.dims;
    function rAt(y){
      var ks = [[d.top, 0.95], [d.top - 0.42, d.shoulder + 0.1], [d.top - 0.98, d.chest + 0.06], [d.top - 1.95, d.waist + 0.06], [d.top - 2.55, d.hips + 0.06], [d.bottom - 0.02, d.hips * 0.93]];
      for (var i = 0; i < ks.length - 1; i++){ if (y <= ks[i][0] && y >= ks[i + 1][0]){ var t = (ks[i][0] - y) / (ks[i][0] - ks[i + 1][0]); return ks[i][1] + t * (ks[i + 1][1] - ks[i][1]); } }
      return y > d.top ? 0.95 : d.hips * 0.93;
    }
    var m = mat(hex, 0.9); m.side = THREE.DoubleSide;
    return mesh(grid(function(u, v){
      var y = y0 + v * (y1 - y0), r = rAt(y), x = (x0 || 0) + (u - 0.5) * width;
      var z = Math.sqrt(Math.max(0, r * r - x * x)) * d.depth + (out || 0.05);
      return new THREE.Vector3(x, y, z);
    }, 16, 18), m);
  }
  // a strap over one shoulder: a short arc over the top, a strip down the chest
  function strap(c, hex, x){
    var d = c.dims, g = new THREE.Group();
    var arc = mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 40, Math.PI), mat(hex, 0.9), x, d.top - 0.5, 0);
    arc.rotation.y = Math.PI / 2; arc.scale.z = 0.75; g.add(arc);
    g.add(frontSheet(c, hex, 0.16, d.top - 0.05, d.top - 1.55, 0.06, x));
    return g;
  }
  function pocket(c, hex, x, y, w, h){ return frontSheet(c, hex, w, y, y - h, 0.09, x); }
  W.parts['torso.tee'] = function(c){ var g = new THREE.Group(); g.add(shell(c, '#f3f1eb')); sleeve(c, 0, '#f3f1eb'); sleeve(c, 1, '#f3f1eb'); g.add(collar(c, '#eceae3')); return g; };
  W.parts['torso.scrubs'] = function(c){ var g = new THREE.Group(); g.add(shell(c, '#6aa2a0')); sleeve(c, 0, '#6aa2a0'); sleeve(c, 1, '#6aa2a0'); g.add(collar(c, '#5d918f')); g.add(pocket(c, '#5d918f', -0.55, c.dims.top - 1.15, 0.55, 0.5)); return g; };
  W.parts['torso.track'] = function(c){
    var g = new THREE.Group(), d = c.dims; g.add(shell(c, '#1f2a44', 0.85));
    [0, 1].forEach(function(i){ sleeve(c, i, '#1f2a44', 'long');
      [0.12, -0.12].forEach(function(dx){ var L = d.upper + d.fore - 0.3; var s = mesh(new THREE.BoxGeometry(0.06, L, 0.03), mat('#f3f1eb', 0.9), dx, -L / 2, 0.37); c.arms[i].add(s); }); });
    g.add(frontSheet(c, '#8b93a6', 0.05, d.top - 0.25, d.top - 2.65, 0.07));
    var cl = mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.22, 40, 1, true), mat('#1f2a44', 0.85), 0, d.top + 0.04, 0); cl.material.side = THREE.DoubleSide; g.add(cl);
    return g;
  };
  W.parts['torso.apron'] = function(c){
    var g = new THREE.Group(), d = c.dims; g.add(shell(c, '#f3f1eb')); sleeve(c, 0, '#f3f1eb'); sleeve(c, 1, '#f3f1eb'); g.add(collar(c, '#eceae3'));
    g.add(frontSheet(c, '#7a6a55', 1.55, d.top - 0.5, d.bottom - 0.35, 0.08));
    g.add(pocket(c, '#6c5d4a', 0, d.top - 1.9, 0.9, 0.55));
    var loop = mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 40), mat('#7a6a55', 0.9), 0, d.top + 0.1, 0); loop.rotation.x = Math.PI / 2; g.add(loop);
    return g;
  };
  W.parts['torso.field'] = function(c){
    var g = new THREE.Group(), d = c.dims; g.add(shell(c, '#6f7a4d')); sleeve(c, 0, '#6f7a4d', 'long'); sleeve(c, 1, '#6f7a4d', 'long');
    g.add(frontSheet(c, '#657045', 0.1, d.top - 0.15, d.bottom, 0.06));
    g.add(pocket(c, '#657045', -0.5, d.top - 1.05, 0.5, 0.45)); g.add(pocket(c, '#657045', 0.5, d.top - 1.05, 0.5, 0.45));
    [-1, 1].forEach(function(s){ var f = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.5), mat('#6f7a4d', 0.9), s * 0.3, d.top + 0.02, 0.35); f.rotation.z = s * 0.35; f.rotation.x = 0.25; g.add(f); });
    return g;
  };
  W.parts['torso.overalls'] = function(c){
    var g = new THREE.Group(), d = c.dims; g.add(shell(c, '#f3f1eb')); sleeve(c, 0, '#f3f1eb'); sleeve(c, 1, '#f3f1eb'); g.add(collar(c, '#eceae3'));
    g.add(frontSheet(c, '#4a5e80', 1.3, d.top - 0.7, d.bottom - 0.3, 0.08));
    g.add(pocket(c, '#405273', 0, d.top - 1.0, 0.6, 0.45));
    g.add(strap(c, '#4a5e80', -0.5)); g.add(strap(c, '#4a5e80', 0.5));
    var waist = mesh(new THREE.TorusGeometry(d.hips + 0.1, 0.08, 8, 48), mat('#4a5e80', 0.9), 0, d.top - 2.5, 0); waist.rotation.x = Math.PI / 2; waist.scale.set(1, d.depth, 1); g.add(waist);
    return g;
  };

  // ---------- legs and feet (in leg space: hip at the origin, the leg hangs down -y) ----------
  function pants(c, hex, len){
    var d = c.dims;
    [0, 1].forEach(function(i){
      var T = len === 'short' ? 1.3 : d.thigh + 0.05;
      c.legs[i].add(mesh(new THREE.CylinderGeometry(d.thighR + 0.07, d.thighR + 0.02, T, 24), mat(hex, 0.92), 0, -T / 2 + 0.1, 0));
      if (len !== 'short') c.legs[i].add(mesh(new THREE.CylinderGeometry(d.shinR + 0.07, d.shinR + 0.05, d.shin, 24), mat(hex, 0.92), 0, -d.thigh - d.shin / 2, 0));
    });
    return null;
  }
  W.parts['legs.trousers'] = function(c){ return pants(c, '#f3f1eb'); };
  W.parts['legs.scrubpant'] = function(c){ return pants(c, '#6aa2a0'); };
  W.parts['legs.shorts'] = function(c){ return pants(c, '#c9b48a', 'short'); };
  W.parts['legs.work'] = function(c){ pants(c, '#6b5238'); c.legs.forEach(function(l){ l.add(mesh(new THREE.BoxGeometry(0.34, 0.4, 0.06), mat('#5e4731', 0.9), 0.32, -0.9, 0.5)); }); return null; };
  W.parts['legs.denim'] = function(c){ return pants(c, '#4a6a9c'); };
  function foot(c, i, hex, o){
    var d = c.dims, y = -(d.thigh + d.shin), g = c.legs[i];
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.42, 1.28), mat(hex, o && o.rough || 0.85), 0, y - 0.19, 0.24));
    if (o && o.sole) g.add(mesh(new THREE.BoxGeometry(0.86, 0.14, 1.34), mat(o.sole, 0.8), 0, y - 0.36, 0.24));
    if (o && o.shaft) g.add(mesh(new THREE.CylinderGeometry(d.shinR + 0.12, d.shinR + 0.16, o.shaft, 24), mat(hex, 0.8), 0, y + o.shaft / 2 - 0.05, 0));
  }
  W.parts['feet.bare'] = function(c){ [0, 1].forEach(function(i){ var d = c.dims, y = -(d.thigh + d.shin); var f = mesh(new THREE.SphereGeometry(0.5, 24, 16), mat(c.skin, 0.85), 0, y - 0.2, 0.2); f.scale.set(0.8, 0.44, 1.25); c.legs[i].add(f); }); return null; };
  W.parts['feet.boots'] = function(c){ [0, 1].forEach(function(i){ foot(c, i, '#4f5b3b', {shaft:1.1, rough:0.6}); }); return null; };
  W.parts['feet.mud'] = function(c){ [0, 1].forEach(function(i){ foot(c, i, '#5a3f2b', {shaft:1.45, rough:0.6}); c.legs[i].add(mesh(new THREE.TorusGeometry(c.dims.shinR + 0.15, 0.03, 8, 32), mat('#3f2b1c', 0.8), 0, -(c.dims.thigh + c.dims.shin) + 1.25, 0)).rotation.x = Math.PI / 2; }); return null; };
  W.parts['feet.sneakers'] = function(c){ [0, 1].forEach(function(i){ foot(c, i, '#f4f4f2', {sole:'#d9d5cb', rough:0.7}); c.legs[i].add(mesh(new THREE.CylinderGeometry(c.dims.shinR + 0.09, c.dims.shinR + 0.11, 0.22, 24), mat('#f4f4f2', 0.7), 0, -(c.dims.thigh + c.dims.shin) + 0.08, 0)); }); return null; };

  // ---------- things in hand (in arm space: the hand sits at the end of the arm) ----------
  function inHand(c, build){ var d = c.dims, g = new THREE.Group(); g.position.set(0.05, -(d.upper + d.fore) - 0.15, 0.35); build(g); c.arms[1].add(g); return null; }
  W.parts['hands.can'] = function(c){ return inHand(c, function(g){
    var tin = mat('#5f7a4a', 0.55);
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.9, 32), tin, 0, -0.3, 0));
    var sp = mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.3, 12), tin, 0.65, 0.1, 0); sp.rotation.z = -0.9; g.add(sp);
    g.add(mesh(new THREE.ConeGeometry(0.2, 0.2, 16), tin, 1.18, 0.58, 0)).rotation.z = -0.9;
    var h = mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 32, Math.PI), tin, -0.2, 0.15, 0); h.rotation.y = Math.PI / 2; g.add(h);
  }); };
  W.parts['hands.chainsaw'] = function(c){ return inHand(c, function(g){
    g.add(mesh(new THREE.BoxGeometry(0.75, 0.5, 0.42), mat('#c94b2a', 0.6), 0, -0.05, 0));
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.14, 0.05), mat('#8a8d90', 0.4), 0.95, -0.05, 0));
    g.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24), mat('#2a2a2a', 0.7), -0.35, 0.2, 0)).rotation.y = Math.PI / 2;
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat('#2a2a2a', 0.7), 0.3, 0.3, 0));
  }); };
  W.parts['hands.launcher'] = function(c){ return inHand(c, function(g){
    var blue = mat('#3f78c9', 0.5);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.5, 20), blue, 0.55, 0, 0)).rotation.z = Math.PI / 2;
    g.add(mesh(new THREE.SphereGeometry(0.34, 24, 16), mat('#8fc4ee', 0.35), -0.25, 0.05, 0));
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.45, 0.16), mat('#2a2a2a', 0.7), 0.15, -0.3, 0));
  }); };
  W.parts['hands.bubbles'] = function(c){ return inHand(c, function(g){
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 20), mat('#e77fb0', 0.4), 0, -0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), mat('#f5c1da', 0.6), 0.25, 0.25, 0)).rotation.z = -0.35;
    g.add(mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 24), mat('#f5c1da', 0.6), 0.48, 0.6, 0)).rotation.x = 0.4;
    [0.2, 0.32, 0.22].forEach(function(r, i){ var b = mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshStandardMaterial({color:col('#dff3ff'), roughness:0.2, metalness:0, transparent:true, opacity:0.45}), 0.9 + i * 0.55, 0.9 + i * 0.45, 0.2 * i); b.castShadow = false; g.add(b); });
  }); };

  // ---------- packs on the back (root space) ----------
  function packBase(c, o){
    var g = new THREE.Group(), d = c.dims, y = d.top - 1.35, z = -(d.chest * d.depth) - 0.42;
    var body = mat(o.body, o.rough || 0.85);
    g.add(mesh(new THREE.BoxGeometry(1.5, 1.85, 0.72), body, 0, y, z));
    g.add(mesh(new THREE.BoxGeometry(1.56, 0.52, 0.8), mat(o.flap || o.body, 0.85), 0, y + 0.72, z - 0.02));
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.55, 0.16), mat(o.pocket || o.flap || o.body, 0.85), 0, y - 0.45, z - 0.44));
    if (o.buckle) g.add(mesh(new THREE.BoxGeometry(0.22, 0.16, 0.06), o.buckle, 0, y + 0.42, z - 0.44));
    g.add(strap(c, o.straps || o.body, -0.55)); g.add(strap(c, o.straps || o.body, 0.55));
    g.userData.y = y; g.userData.z = z; return g;
  }
  W.parts['back.pack_basic'] = function(c){ return packBase(c, {body:'#b6a07a', flap:'#5f6a3a', pocket:'#5f6a3a', straps:'#5a4a38', buckle:mat('#c9a24c', 0.35)}); };
  W.parts['back.pack_ivory'] = function(c){ return packBase(c, {body:'#efe6d6', flap:'#3d6b4a', pocket:'#efe6d6', straps:'#3d6b4a', buckle:mat('#d4b25a', 0.3), rough:0.6}); };
  W.parts['back.pack_sun'] = function(c){ var g = packBase(c, {body:'#141414', flap:'#141414', pocket:'#1c1c1c', straps:'#1c1c1c', rough:0.55});
    var gold = mat('#d8b24f', 0.3), y = g.userData.y, z = g.userData.z;
    g.add(mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 40), gold, 0, y + 0.05, z - 0.38));
    for (var i = 0; i < 8; i++){ var sp = mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), gold, Math.sin(i * Math.PI / 4) * 0.44, y + 0.05 + Math.cos(i * Math.PI / 4) * 0.44, z - 0.38); sp.rotation.z = -i * Math.PI / 4; g.add(sp); }
    var core = mesh(new THREE.SphereGeometry(0.16, 20, 14), glow('#ffd27a', '#ffb347', 1.4), 0, y + 0.05, z - 0.4); core.castShadow = false; g.add(core);
    return g; };
  W.parts['back.pack_neon'] = function(c){ var g = packBase(c, {body:'#b2286f', flap:'#8f1e58', pocket:'#8f1e58', straps:'#4a1230', rough:0.45});
    var y = g.userData.y, z = g.userData.z, rail = glow('#ff7fc4', '#ff4fa8', 1.6);
    [-0.7, 0.7].forEach(function(x){ var r = mesh(new THREE.BoxGeometry(0.06, 1.7, 0.06), rail, x, y, z - 0.38); r.castShadow = false; g.add(r); });
    var t = mesh(new THREE.SphereGeometry(0.2, 20, 14), glow('#ffb6dc', '#ff6fb8', 1.5), 0, y + 0.15, z - 0.45); t.scale.set(0.8, 1.2, 0.6); t.castShadow = false; g.add(t);
    return g; };
  W.parts['back.pack_cyber'] = function(c){ var g = packBase(c, {body:'#1a1d22', flap:'#1a1d22', pocket:'#23272e', straps:'#23272e', rough:0.5});
    var y = g.userData.y, z = g.userData.z, cyan = glow('#7fe8f8', '#33d6f0', 1.6);
    [[-0.72, y, 0.06, 1.75], [0.72, y, 0.06, 1.75], [0, y + 0.95, 1.5, 0.06]].forEach(function(p){ var r = mesh(new THREE.BoxGeometry(p[2], p[3], 0.05), cyan, p[0], p[1], z - 0.39); r.castShadow = false; g.add(r); });
    var sc = mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), glow('#7dff9a', '#3cff6a', 1.4), 0, y + 0.15, z - 0.47); sc.castShadow = false; g.add(sc);
    return g; };
  W.parts['back.pack_starlight'] = function(c){ var g = packBase(c, {body:'#1c2a55', flap:'#16214a', pocket:'#16214a', straps:'#16214a', rough:0.6});
    var y = g.userData.y, z = g.userData.z;
    for (var i = 0; i < 14; i++){ var s = mesh(new THREE.SphereGeometry(0.025, 8, 6), glow('#ffffff', '#ffffff', 1.2), (Math.sin(i * 2.3) * 0.6), y + Math.cos(i * 1.7) * 0.75, z - 0.37); s.castShadow = false; g.add(s); }
    var dome = mesh(new THREE.SphereGeometry(0.32, 24, 16), new THREE.MeshStandardMaterial({color:col('#cfe6ff'), roughness:0.1, metalness:0, transparent:true, opacity:0.35}), 0, y + 0.2, z - 0.55); dome.castShadow = false; g.add(dome);
    var fl = mesh(new THREE.SphereGeometry(0.13, 16, 12), glow('#9fd0ff', '#4aa8ff', 1.8), 0, y + 0.25, z - 0.55); fl.castShadow = false; g.add(fl);
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), mat('#3d6b4a', 0.8), 0, y + 0.05, z - 0.55));
    return g; };

  // ---------- things bolted on (root space) ----------
  W.parts['attach.rocket'] = function(c){
    var g = new THREE.Group(), d = c.dims, y = d.top - 1.35, z = -(d.chest * d.depth) - 0.42 - 0.62;
    var steel = mat('#cfd3d8', 0.35), red = mat('#c8362b', 0.6), dark = mat('#2a2a2a', 0.7);
    [-0.42, 0.42].forEach(function(x){
      g.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.5, 24), steel, x, y, z));
      g.add(mesh(new THREE.ConeGeometry(0.27, 0.42, 24), red, x, y + 0.96, z));
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.25, 24), dark, x, y - 0.85, z));
    });
    g.add(mesh(new THREE.BoxGeometry(1.1, 0.16, 0.2), dark, 0, y + 0.3, z + 0.3));
    return g;
  };

  // ---------- toppers (head space) ----------
  W.parts['topper.kite'] = function(c){
    var g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), mat('#8a6a3a', 0.8), 0.35, 1.85, -0.1));
    var kite = mesh(new THREE.PlaneGeometry(0.8, 0.8), mat('#c8362b', 0.8), 0.35, 2.65, -0.1); kite.material.side = THREE.DoubleSide; kite.rotation.z = Math.PI / 4; kite.rotation.x = -0.25; kite.scale.set(1, 1.25, 1); g.add(kite);
    var inner = mesh(new THREE.PlaneGeometry(0.36, 0.36), mat('#f1e9d2', 0.8), 0.35, 2.65, -0.08); inner.material.side = THREE.DoubleSide; inner.rotation.z = Math.PI / 4; inner.rotation.x = -0.25; inner.scale.set(1, 1.25, 1); g.add(inner);
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), mat('#f1e9d2', 0.9), 0.35, 1.9, -0.25)).rotation.x = 0.15;
    return g;
  };
  W.parts['topper.bloom'] = function(c){
    var g = new THREE.Group(), pink = mat('#e07a9b', 0.85), deep = mat('#c85e83', 0.85);
    var at = new THREE.Vector3(-0.98, 0.28, 0.22);
    [[0, 0, 0, 0.2], [0.14, 0.12, 0.06, 0.15], [-0.1, 0.16, 0.08, 0.14], [0.02, -0.15, 0.12, 0.15], [-0.14, -0.06, 0.1, 0.13], [0.12, -0.02, 0.16, 0.12]].forEach(function(p, i){ g.add(mesh(new THREE.SphereGeometry(p[3], 16, 12), i % 2 ? deep : pink, at.x + p[0], at.y + p[1], at.z + p[2])); });
    var leaf = mesh(new THREE.SphereGeometry(0.16, 12, 8), mat('#5f8a4a', 0.9), at.x - 0.05, at.y - 0.22, at.z - 0.05); leaf.scale.set(1.4, 0.4, 0.8); g.add(leaf);
    return g;
  };
})();
