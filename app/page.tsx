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

export default function DoolyOS_Final_Fixed() {
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
  const [showUserList, setShowUserList] = useState(false);
  const [isNotiEnabled, setIsNotiEnabled] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const canvasContainerRef = useRef(null);
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  
  const clickDataRef = useRef({ time: 0, x: 0.5, y: 0.5, targetIntensity: 0, currentIntensity: 0 });
  const isDarkModeRef = useRef(isDarkMode); 
  const isFirstLoad = useRef(true);

  useEffect(() => { isDarkModeRef.current = isDarkMode; }, [isDarkMode]);

  useEffect(() => {
    const savedName = localStorage.getItem("aether-name");
    const savedImg = localStorage.getItem("aether-profile");
    const savedTheme = localStorage.getItem("aether-theme");
    const savedRooms = JSON.parse(localStorage.getItem("aether-my-rooms") || "[]");
    const savedNoti = localStorage.getItem("aether-noti");
    if (savedName) { setMyName(savedName); setTempName(savedName); }
    if (savedImg) { setMyProfileImg(savedImg); setTempImg(savedImg); }
    if (savedTheme !== null) setIsDarkMode(savedTheme === "true");
    if (savedNoti !== null) setIsNotiEnabled(savedNoti === "true");
    setMyRooms(savedRooms);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("aether-theme", (!isDarkMode).toString());
  };

  const toggleNoti = () => {
    const newVal = !isNotiEnabled;
    setIsNotiEnabled(newVal);
    localStorage.setItem("aether-noti", newVal.toString());
  };

  const openPopup = () => {
    window.open(window.location.href, 'DoolyOS_Popup', 'width=450,height=800,menubar=no,toolbar=no');
  };

  // 🎨 WebGL 전역 배경 (어떤 화면에서든 유지됨)
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
      uniform float uClickTime; uniform vec2 uClickPos; uniform float uClickIntensity;

      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(in vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 x) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; ++i) { v += a * noise(x); x = x * 2.0 + vec3(100); a *= 0.5; } return v; }
      mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        float timeSinceClick = uTime - uClickTime;
        float wave = (timeSinceClick > 0.0 && timeSinceClick < 2.0) ? exp(-pow(length(uv - (uClickPos - 0.5) * (uResolution/min(uResolution.x,uResolution.y))) - timeSinceClick * 2.0, 2.0) * 100.0) * uClickIntensity * (1.0 - timeSinceClick/2.0) : 0.0;
        
        vec3 colorA = mix(vec3(0.85, 0.92, 1.0), vec3(0.05, 0.0, 0.15), uDarkMode);
        vec3 colorB = mix(vec3(0.98, 0.85, 0.95), vec3(0.0, 0.15, 0.3), uDarkMode);
        
        float den = 0.0; float t = 0.0;
        for(int i=0; i<12; i++) {
            vec3 p = vec3(uv, -1.0) * t;
            p.xz *= rot(uTime * 0.1);
            den += fbm(p * 1.5 + uTime * 0.1) * 0.1;
            t += 0.2;
        }
        vec3 finalColor = mix(colorA, colorB, uv.x + 0.5) + den * mix(vec3(1.0, 0.9, 0.8), vec3(0.5, 0.7, 1.0), uDarkMode);
        gl_FragColor = vec4(finalColor + wave, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
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
      currentDarkVal += ( (isDarkModeRef.current ? 1.0 : 0.0) - currentDarkVal) * 0.05;
      gl.uniform1f(locTime, time);
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locDark, currentDarkVal);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    render();
  }, []); // 빈 의존성으로 전역 유지

  // [메시지 구독 및 로직 생략 - 이전과 동일하게 유지]
  useEffect(() => {
    if (!currentRoom || !myName) return;
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [currentRoom, myName]);

  const joinRoom = async (name) => {
    if (!name.trim()) return;
    if (!myRooms.includes(name)) {
      const updated = [name, ...myRooms];
      setMyRooms(updated);
      localStorage.setItem("aether-my-rooms", JSON.stringify(updated));
    }
    setCurrentRoom(name);
  };

  const theme = {
    card: `transition-all duration-1000 ${isDarkMode ? 'bg-black/40 border-white/10 shadow-2xl' : 'bg-white/70 border-white/80 shadow-lg'} backdrop-blur-3xl`,
    textMain: `transition-colors duration-1000 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`,
    input: `transition-all duration-1000 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black'}`,
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'bg-[#0a0a0f]' : 'bg-[#f4f6f9]'}`}>
      {/* ✨ 전역 셰이더 레이어 */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* 헤더 및 컨트롤 */}
      <div className="absolute top-6 right-6 z-50 flex gap-3">
        <button onClick={toggleNoti} className="text-[10px] font-black border border-white/20 px-4 py-2 rounded-full backdrop-blur-md text-white/70 hover:bg-white/10 transition-all">{isNotiEnabled ? "🔔 ON" : "🔕 OFF"}</button>
        <button onClick={openPopup} className="text-[10px] font-black border border-white/20 px-4 py-2 rounded-full backdrop-blur-md text-white/70 hover:bg-white/10 transition-all">↗ POP-OUT</button>
      </div>

      {!currentRoom ? (
        <div className="h-full flex items-center justify-center p-6 relative z-10">
          <div className={`${theme.card} w-full max-w-[420px] rounded-[40px] border flex flex-col items-center py-14 px-0 overflow-hidden`}>
            
            {/* ✨ image_dda209.jpg 타이틀 보정: Optical Center 정렬 */}
            <div className="relative mb-8 flex justify-center w-full px-10">
               <h1 className={`ULTRA_PRISM_TEXT text-[4.8rem] font-black italic tracking-tighter uppercase select-none leading-none transition-all duration-1000 ${isDarkMode ? 'night' : 'day'}`}>DOOLY</h1>
            </div>

            {!myName ? (
              <div className="w-[320px] space-y-5">
                <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER ID" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm tracking-widest`} />
                <button onClick={() => { localStorage.setItem("aether-name", tempName); setMyName(tempName); }} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all">Start System</button>
              </div>
            ) : (
              <div className="w-[320px] flex flex-col items-center">
                <img src={myProfileImg || "https://www.gstatic.com/images/branding/product/2x/avatar_anonymous_dark_64dp.png"} className="w-20 h-20 rounded-full border-2 border-indigo-500/30 mb-4 object-cover" />
                <p className={`${theme.textMain} font-black text-xl mb-6 tracking-tight`}>{myName}</p>
                
                <div className="w-full h-[35vh] flex flex-col">
                  <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center mb-6 font-bold text-xs tracking-widest`} />
                  <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    {myRooms.map(room => (
                      <button key={room} onClick={() => setCurrentRoom(room)} className={`w-full ${theme.input} px-5 py-4 rounded-xl flex items-center justify-between hover:scale-[1.02] transition-all group`}>
                        <span className="invisible text-[9px] font-bold">Connect</span>
                        <span className={`font-black ${theme.textMain} text-sm`}>{room}</span>
                        <span className="text-[9px] text-indigo-500 font-bold uppercase opacity-0 group-hover:opacity-100 transition-all">Connect</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={toggleTheme} className="mt-8 text-zinc-500 text-[9px] font-black uppercase tracking-widest hover:text-indigo-500 transition-all">{isDarkMode ? "Day Mode" : "Night Mode"}</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ✨ 채팅방 UI: 배경 셰이더가 뒤에 깔린 채로 렌더링됨 */
        <div className="h-full flex flex-col relative z-10 transition-all duration-1000">
          <header className={`px-6 py-4 border-b flex justify-between items-center backdrop-blur-xl ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-black/5 bg-white/20'}`}>
            <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold`}>◀ EXIT</button>
            <h1 className="text-indigo-500 font-black italic uppercase tracking-tighter">{currentRoom}</h1>
            <button onClick={toggleTheme} className={`${theme.textSub} text-[10px] font-bold uppercase`}>{isDarkMode ? "DAY" : "NIGHT"}</button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
                <div className={`p-4 rounded-[20px] max-w-[70%] text-sm ${m.userName === myName ? 'bg-indigo-600 text-white rounded-tr-none' : isDarkMode ? 'bg-white/10 text-white rounded-tl-none' : 'bg-white text-zinc-900 shadow-sm rounded-tl-none'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer className="p-5 backdrop-blur-xl">
            <form onSubmit={(e) => { e.preventDefault(); if(input.trim()) addDoc(collection(db, "rooms", currentRoom, "messages"), { text: input, userName: myName, createdAt: serverTimestamp() }); setInput(""); }} 
                  className={`max-w-4xl mx-auto flex gap-3 ${theme.input} p-2 rounded-2xl`}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type message..." className="flex-1 bg-transparent px-3 outline-none text-sm font-medium" />
              <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg">Send</button>
            </form>
          </footer>
        </div>
      )}

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, #ff0055 0%, #ff5500 15%, #ffcc00 30%, #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; 
          animation: prism 4s linear infinite; padding-right: 0.15em; /* 이탤릭 기울기 보정 */
        }
        .ULTRA_PRISM_TEXT::before {
          content: "DOOLY"; position: absolute; left: 0; top: 0; z-index: -1;
          filter: blur(15px); opacity: 0.5; -webkit-text-stroke: 1px rgba(255,255,255,0.2);
        }
        .ULTRA_PRISM_TEXT.night::before { color: white; text-shadow: 0 0 30px rgba(255,255,255,0.4); }
        .ULTRA_PRISM_TEXT.day::before { color: black; text-shadow: 0 0 20px rgba(0,0,0,0.1); }
        @keyframes prism { to { background-position: 200% center; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
