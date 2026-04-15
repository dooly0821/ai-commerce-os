"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 🔥 Firebase 설정
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
const DEFAULT_AVATAR = "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png";

export default function DoolyOS_PixelPerfect_Final() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState("");
  const [myRooms, setMyRooms] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [myName, setMyName] = useState(""); 
  const [myProfileImg, setMyProfileImg] = useState(""); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [isNotiEnabled, setIsNotiEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const canvasContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isDarkModeRef = useRef(isDarkMode); 

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
    const savedName = localStorage.getItem("dooly-name");
    const savedImg = localStorage.getItem("dooly-profile");
    const savedTheme = localStorage.getItem("dooly-theme");
    const savedRooms = JSON.parse(localStorage.getItem("dooly-rooms") || "[]");
    const savedNoti = localStorage.getItem("dooly-noti");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    if (savedNoti !== null) setIsNotiEnabled(savedNoti === "true");
    setMyRooms(savedRooms);
  }, [isDarkMode]);

  // 🎨 WebGL 전역 배경
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    canvasContainerRef.current.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvasContainerRef.current.appendChild(canvas);
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
    const fsSource = `
      precision mediump float;
      uniform float uTime; uniform vec2 uResolution; uniform float uDarkMode; 
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(in vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 x) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; ++i) { v += a * noise(x); x = x * 2.0 + vec3(100.0); a *= 0.5; } return v; }
      mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        vec3 colorA = mix(vec3(0.85, 0.92, 1.0), vec3(0.05, 0.01, 0.1), uDarkMode);
        vec3 colorB = mix(vec3(0.98, 0.9, 0.95), vec3(0.02, 0.1, 0.25), uDarkMode);
        float den = 0.0; float t = 0.0;
        for(int i=0; i<10; i++) {
            vec3 p = vec3(uv * (1.0 + t * 0.1), -1.0) * (t + 1.0);
            p.xz *= rot(uTime * 0.1 + t);
            den += fbm(p * 0.8 + uTime * 0.05) * 0.12;
            t += 0.3;
        }
        vec3 final = mix(colorA, colorB, uv.y + 0.5) + den * mix(vec3(1.0), vec3(0.4, 0.6, 1.0), uDarkMode);
        gl_FragColor = vec4(final, 1.0);
      }
    `;

    const program = gl.createProgram();
    const createShader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const locTime = gl.getUniformLocation(program, 'uTime');
    const locRes = gl.getUniformLocation(program, 'uResolution');
    const locDark = gl.getUniformLocation(program, 'uDarkMode');
    const posLoc = gl.getAttribLocation(program, 'position');

    let currentDarkVal = isDarkModeRef.current ? 1.0 : 0.0;
    const render = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      const time = performance.now() * 0.001;
      currentDarkVal += ((isDarkModeRef.current ? 1.0 : 0.0) - currentDarkVal) * 0.04;
      gl.uniform1f(locTime, time);
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locDark, currentDarkVal);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    render();
  }, []);

  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.userName !== myName && isNotiEnabled) {
        setToastMsg({ name: lastMsg.userName, text: lastMsg.text, photo: lastMsg.userPhoto });
        setTimeout(() => setToastMsg(null), 4000);
      }
    });
    return () => unsubscribe();
  }, [currentRoom, myName, isNotiEnabled]);

  const joinRoom = (name) => {
    if (!name.trim()) return;
    const updated = [...new Set([name, ...myRooms])];
    setMyRooms(updated);
    localStorage.setItem("dooly-rooms", JSON.stringify(updated));
    setCurrentRoom(name);
  };

  const theme = {
    card: `transition-all duration-1000 ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-white/70 border-white/80 shadow-lg'} backdrop-blur-3xl`,
    textMain: `transition-colors duration-1000 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`,
    input: `transition-all duration-1000 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'bg-[#060608]' : 'bg-[#f0f2f5]'}`}>
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* ✨ 3. 하단 토스트 알림 */}
      {toastMsg && (
        <div className="absolute bottom-24 right-8 z-[100] animate-in slide-in-from-bottom-4 duration-500 pointer-events-none">
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <img src={toastMsg.photo || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover border border-white/20" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{toastMsg.name}</span>
              <span className="text-white text-xs font-bold truncate max-w-[180px] mt-0.5">{toastMsg.text}</span>
            </div>
          </div>
        </div>
      )}

      <main className="relative h-full w-full z-10 flex flex-col items-center justify-center">
        {!currentRoom ? (
          <div className="flex flex-col items-center">
            {/* ✨ 우측 상단 겹침 방지 헤더 (메인화면용) */}
            <div className="absolute top-8 right-10 z-50 flex items-center gap-4">
              <button onClick={() => { setIsDarkMode(!isDarkMode); localStorage.setItem("dooly-theme", (!isDarkMode).toString()); }} className="text-[10px] font-black border border-white/20 px-5 py-2.5 rounded-full backdrop-blur-xl text-white/80 hover:bg-white/20 transition-all uppercase tracking-widest">
                {isDarkMode ? "Day Mode" : "Night Mode"}
              </button>
            </div>

            <div className={`${theme.card} w-full max-w-[440px] rounded-[52px] flex flex-col items-center py-16 px-0 animate-in fade-in zoom-in duration-700`}>
              <div className="w-[330px] flex flex-col items-center mx-auto">
                <h1 className={`ULTRA_PRISM_TEXT text-[5.2rem] font-black italic tracking-tighter uppercase leading-none mb-10 transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
                {!myName ? (
                  <div className="w-full space-y-6">
                    <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER IDENTITY" className={`w-full ${theme.input} px-8 py-5 rounded-[24px] text-center outline-none font-bold text-sm tracking-widest`} />
                    <button onClick={() => { if(tempName.trim()){localStorage.setItem("dooly-name", tempName); setMyName(tempName);}}} className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl">Start System</button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 shadow-2xl mb-4 overflow-hidden">
                       <img src={myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                    </div>
                    <p className={`${theme.textMain} font-black text-2xl mb-10 tracking-tight`}>{myName}</p>
                    <div className="w-full flex flex-col h-[35vh]">
                      <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-5 rounded-[20px] text-center mb-6 font-bold text-xs tracking-[0.2em] outline-none`} />
                      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
                        {myRooms.map(room => (
                          <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-6 py-5 rounded-[20px] grid grid-cols-[1fr_2fr_1fr] items-center hover:bg-indigo-500/10 transition-all group active:scale-[0.98]`}>
                            <span className="invisible text-[9px] font-bold">Connect</span>
                            <span className={`font-black ${theme.textMain} text-[14px] tracking-tight text-center`}>{room}</span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-all text-right">Connect</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-8 text-zinc-500 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-red-500 transition-all">Logout Session</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* ✨ 우측 상단 겹침 방지 헤더 (채팅방용) */}
            <header className={`px-10 py-6 border-b flex justify-between items-center backdrop-blur-2xl ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-black/5 bg-white/40'}`}>
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[11px] font-black tracking-widest hover:text-indigo-500 transition-colors uppercase`}>◀ Back</button>
                <h1 className="text-xl font-black italic text-indigo-500 uppercase tracking-tighter ml-2">{currentRoom}</h1>
              </div>
              
              {/* 버튼 그룹과 프로필을 분리하여 겹침 방지 */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setIsDarkMode(!isDarkMode); localStorage.setItem("dooly-theme", (!isDarkMode).toString()); }} className="text-[9px] font-black border border-white/10 px-4 py-2 rounded-full text-white/60 hover:bg-white/10 transition-all uppercase">
                    {isDarkMode ? "DAY" : "NIGHT"}
                  </button>
                  <button onClick={() => setShowUserList(!showUserList)} className="text-[9px] font-black border border-white/10 px-4 py-2 rounded-full text-white/60 hover:bg-white/10 transition-all uppercase">
                    Users
                  </button>
                </div>
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                  <span className={`${theme.textMain} text-[13px] font-black tracking-tight`}>{myName}</span>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-indigo-500/20 shadow-lg">
                    <img src={myProfileImg || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-10 no-scrollbar w-full max-w-5xl mx-auto">
              {messages.map((m) => (
                m.type === "system" ? (
                  /* ✨ 접속 안내 문구 정가운데 정렬 */
                  <div key={m.id} className="w-full flex justify-center my-4">
                    <div className="px-6 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
                      <span className={`${theme.textSub} text-[11px] font-bold tracking-tight opacity-60`}>{m.text}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`flex gap-5 ${m.userName === myName ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-500`}>
                    {/* ✨ 프로필 동그라미 깨짐 방지 레이아웃 */}
                    <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden border border-white/10 shadow-lg self-end">
                      <img src={m.userPhoto || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                    </div>
                    <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <span className={`${theme.textSub} text-[11px] font-black mb-2 uppercase tracking-widest opacity-50`}>{m.userName}</span>
                      <div className={`p-6 rounded-[28px] text-[15px] leading-relaxed shadow-2xl transition-all duration-700 ${m.userName === myName ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-br-none' : isDarkMode ? 'bg-white/10 text-white border border-white/5 rounded-bl-none' : 'bg-white text-zinc-900 border border-black/5 rounded-bl-none'}`}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-10 backdrop-blur-3xl border-t border-white/5">
              <form onSubmit={(e) => { e.preventDefault(); if(input.trim()) addDoc(collection(db, "rooms", currentRoom, "messages"), { text: input, userName: myName, userPhoto: myProfileImg, createdAt: serverTimestamp() }); setInput(""); }} 
                    className={`max-w-4xl mx-auto flex gap-4 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white text-black shadow-2xl'} p-2 rounded-[28px] border transition-all focus-within:ring-4 focus-within:ring-indigo-500/20`}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="DATA TRANSMISSION..." className="flex-1 bg-transparent px-8 outline-none text-[15px] font-bold text-inherit" />
                <button type="submit" className="bg-indigo-600 text-white px-10 py-5 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-indigo-500">Transmit</button>
              </form>
            </footer>
          </div>
        )}
      </main>

      {/* 우측 유저 목록 사이드바 */}
      {showUserList && (
        <div className={`absolute top-28 right-10 w-72 p-6 rounded-[32px] ${theme.card} z-50 animate-in slide-in-from-right duration-500`}>
          <h3 className={`${theme.textMain} text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-50`}>Participants</h3>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
            {activeUsers.map((user, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <img src={user.photo || DEFAULT_AVATAR} className="w-full h-full object-cover" />
                </div>
                <span className={`${theme.textMain} font-bold text-sm tracking-tight`}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055 0%, #ff5500 15%, #ffcc00 30%, #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; padding-right: 0.18em; position: relative;
        }
        .ULTRA_PRISM_TEXT::before { content: "DOOLY"; position: absolute; left: 0; top: 0; z-index: -1; filter: blur(30px); opacity: 0.4; }
        .ULTRA_PRISM_TEXT.night::before { color: white; text-shadow: 0 0 40px rgba(255,255,255,0.4); }
        .ULTRA_PRISM_TEXT.day::before { color: black; text-shadow: 0 0 30px rgba(0,0,0,0.1); }
        @keyframes prism { to { background-position: 200% center; } }
      `}</style>
    </div>
  );
}
