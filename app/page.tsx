"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function DoolyOS_Shader_Premium() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [myRooms, setMyRooms] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempImg, setTempImg] = useState("");

  const canvasRef = useRef(null);
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  const isUserAtBottom = useRef(true);

  // ✨ WebGL 셰이더 로직 통합
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
    const fsSource = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uMode;

      mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c, -s, s, c); }
      float sdOctahedron(vec3 p, float s) {
        p = abs(p); float m = p.x + p.y + p.z - s;
        return m * 0.57735027;
      }
      float map(vec3 p) {
        p.xz *= rot(uTime * 0.2); p.xy *= rot(uTime * 0.1);
        float core = sdOctahedron(p, 1.8) + sin(p.x*3.0+uTime)*0.1;
        return core;
      }
      vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.001, 0.0);
        return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
      }
      vec3 getBackground(vec3 rd) {
        float b = max(0.0, rd.y * 0.5 + 0.5);
        vec3 color = mix(vec3(0.02, 0.02, 0.05), vec3(0.1, 0.05, 0.2), b);
        if(uMode < 0.5) color = mix(vec3(0.9, 0.92, 0.95), vec3(0.7, 0.8, 1.0), b);
        return color;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        vec3 ro = vec3(0, 0, 5.0);
        vec3 rd = normalize(vec3(uv, -1.0));
        float t = 0.0;
        for(int i=0; i<60; i++) {
          float d = map(ro + rd * t);
          if(d < 0.001 || t > 20.0) break;
          t += d;
        }
        vec3 col = getBackground(rd);
        if(t < 20.0) {
          vec3 p = ro + rd * t;
          vec3 n = getNormal(p);
          float fresnel = pow(1.0 - max(0.0, dot(-rd, n)), 3.0);
          vec3 refr = refract(rd, n, 0.6);
          vec3 prism = vec3(
            getBackground(refract(rd, n, 0.62)).r,
            getBackground(refract(rd, n, 0.65)).g,
            getBackground(refract(rd, n, 0.68)).b
          );
          col = prism * 2.0 + fresnel * vec3(0.5, 0.8, 1.0);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source); gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uMode = gl.getUniformLocation(program, 'uMode');
    const posLoc = gl.getAttribLocation(program, 'position');

    const render = (time) => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform1f(uTime, time * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uMode, isDarkMode ? 1.0 : 0.0);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }, [isDarkMode]);

  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    const savedTheme = localStorage.getItem("aether-theme");
    const savedRooms = JSON.parse(localStorage.getItem("aether-my-rooms") || "[]");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    setMyRooms(savedRooms);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("aether-theme", newMode.toString());
  };

  const handleProfileSave = (e) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return alert("아이디를 입력해주세요!");
    const finalImg = tempImg || myProfileImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";
    localStorage.setItem("aether-name", tempName);
    localStorage.setItem("aether-profile", finalImg);
    setMyName(tempName);
    setMyProfileImg(finalImg);
    setIsEditingProfile(false); 
  };

  const handleProfileImgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempImg(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const joinRoom = async (roomName) => {
    const name = roomName.trim();
    if (!name) return;
    if (!myRooms.includes(name)) {
      const updatedRooms = [name, ...myRooms];
      setMyRooms(updatedRooms);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updatedRooms));
    }
    await setDoc(doc(db, "rooms", name), { name: name, updatedAt: serverTimestamp() }, { merge: true });
    setCurrentRoom(name);
  };

  const leaveRoom = (e, roomName) => {
    e.stopPropagation();
    if (confirm(`'${roomName}' 노드에서 나가시겠습니까?`)) {
      const updatedRooms = myRooms.filter(r => r !== roomName);
      setMyRooms(updatedRooms);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updatedRooms));
    }
  };

  const deleteMsg = async (id) => {
    if (confirm("메시지를 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
    }
  };

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [currentRoom, myName]);

  const sendMessage = async (e, imgData = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !imgData) || !myName) return;
    const currentInput = input;
    setInput("");
    try {
      await addDoc(collection(db, "rooms", currentRoom, "messages"), {
        text: currentInput, image: imgData, userName: myName, userPhoto: myProfileImg, type: "chat", createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "rooms", currentRoom), { updatedAt: serverTimestamp() }, { merge: true });
      isUserAtBottom.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      alert("🚨 전송 실패!");
      setInput(currentInput);
    }
  };

  const theme = {
    bg: isDarkMode ? "bg-black" : "bg-white",
    card: isDarkMode ? "bg-black/40 border-white/10" : "bg-white/80 border-black/5",
    text: isDarkMode ? "text-white" : "text-black",
    input: isDarkMode ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5",
  };

  if (!myName) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center font-sans overflow-hidden transition-all duration-700`}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className={`${theme.card} relative z-10 w-full max-w-md p-12 rounded-[50px] border backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-10 animate-in zoom-in duration-1000`}>
        <div className="text-center">
          <h1 className="DOOLY_GLOW text-8xl font-black italic tracking-tighter mb-2">DOOLY</h1>
          <button onClick={toggleTheme} className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">
            {isDarkMode ? "Night Protocol" : "Day Protocol"}
          </button>
        </div>
        <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center gap-8">
          <div className={`w-28 h-28 rounded-full ${theme.input} border overflow-hidden cursor-pointer flex items-center justify-center`} onClick={() => profileInputRef.current.click()}>
            {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-zinc-500">PHOTO +</span>}
          </div>
          <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
          <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ACCESS ID" className={`w-full ${theme.input} border p-5 rounded-2xl ${theme.text} text-center font-bold tracking-widest outline-none`} />
          <button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl text-white font-black tracking-widest shadow-lg shadow-blue-500/30">START SYSTEM</button>
        </form>
      </div>
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', -apple-system, sans-serif !important; letter-spacing: -0.02em; }
        .DOOLY_GLOW {
          background: linear-gradient(135deg, #fff 0%, #aaa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 20px rgba(255,255,255,0.4)) drop-shadow(0 0 40px rgba(0,191,255,0.3));
        }
      `}</style>
    </div>
  );

  if (!currentRoom) return (
    <div className={`h-screen ${theme.bg} flex items-center justify-center overflow-hidden transition-all duration-700`}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className={`${theme.card} relative z-10 w-full max-w-md p-10 rounded-[40px] border backdrop-blur-3xl shadow-2xl`}>
        <div className="flex flex-col items-center mb-10">
          <img src={myProfileImg} className="w-24 h-24 rounded-full border-2 border-blue-500/20 mb-4 object-cover" />
          <h2 className={`text-2xl font-black ${theme.text}`}>{myName}</h2>
          <div className="flex gap-5 mt-4">
            <button onClick={toggleTheme} className="text-[9px] font-bold text-blue-500 uppercase">{isDarkMode ? "Day" : "Night"}</button>
            <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-[9px] font-bold text-zinc-500 uppercase">Logout</button>
          </div>
        </div>
        <div className="space-y-6">
          <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE" className={`w-full ${theme.input} border p-4 rounded-xl ${theme.text} text-center font-bold outline-none`} />
          <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            {myRooms.map((room) => (
              <button key={room} onClick={() => joinRoom(room)} className={`w-full ${theme.input} border p-4 rounded-xl flex justify-between items-center hover:bg-blue-600/10 transition-all group`}>
                <span className={`font-black ${theme.text}`}>{room}</span>
                <span className="text-[9px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">CONNECT</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f5f5f5]'} transition-colors`}>
      <header className={`px-8 py-5 border-b ${theme.border} flex justify-between items-center backdrop-blur-md z-10`}>
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentRoom("")} className="text-blue-500 text-[10px] font-black uppercase">◀ Exit</button>
          <h1 className="text-sm font-black text-blue-500 italic uppercase">{currentRoom}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[9px] font-bold border ${theme.border} px-3 py-2 rounded-full`}>{isDarkMode ? "DAY" : "NIGHT"}</button>
          <img src={myProfileImg} className="w-9 h-9 rounded-full object-cover border" />
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
            <img src={m.userPhoto} className="w-9 h-9 rounded-full shrink-0 object-cover" />
            <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
              <span className="text-[9px] font-bold text-zinc-500 mb-2 uppercase">{m.userName}</span>
              <div className={`p-5 rounded-2xl text-[14px] leading-relaxed ${m.userName === myName ? 'bg-blue-600 text-white rounded-tr-none' : `${theme.card} rounded-tl-none border ${theme.text}`}`}>
                {m.image && <img src={m.image} className="w-full rounded-xl mb-4" />}
                <p>{m.text}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <footer className="p-6">
        <form onSubmit={sendMessage} className={`max-w-4xl mx-auto flex items-center gap-3 ${theme.input} border p-2 rounded-2xl`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-11 h-11 text-zinc-500">+</button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type message..." className={`flex-1 bg-transparent px-2 text-sm ${theme.text} outline-none font-bold`} />
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase shadow-lg">Send</button>
        </form>
      </footer>
    </div>
  );
}
