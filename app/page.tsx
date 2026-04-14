"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";

// 🔥 코어 로직 절대 보존 영역 (건드리지 않음)
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

export default function DoolyOS_Interactive_Premium() {
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

  const canvasContainerRef = useRef(null);
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const profileInputRef = useRef(null);
  const isUserAtBottom = useRef(true);
  const clickDataRef = useRef({ time: 0, x: 0.5, y: 0.5, intensity: 0 });

  // 🎨 민혁님이 제공한 JS.txt 기반의 반응형 WebGL 배경 로직
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    
    // 이전 캔버스가 있다면 초기화
    canvasContainerRef.current.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvasContainerRef.current.appendChild(canvas);
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // 화면 클릭 이벤트 (좌/우 반응형 로직)
    const handleClick = (e) => {
      clickDataRef.current.time = performance.now() * 0.001;
      clickDataRef.current.x = e.clientX / window.innerWidth;
      clickDataRef.current.y = 1.0 - (e.clientY / window.innerHeight);
      clickDataRef.current.intensity = 1.0; // 클릭 시 반응 강도 MAX
    };
    window.addEventListener('click', handleClick);

    const vsSource = `attribute vec2 position; varying vec2 vUv; void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
    const fsSource = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uDarkMode;
      
      // 클릭 반응형 유니폼
      uniform float uClickTime;
      uniform vec2 uClickPos;
      uniform float uClickIntensity;

      // 노이즈 함수 (JS.txt 기반)
      float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(in vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 x) {
          float v = 0.0;
          float a = 0.5;
          vec3 shift = vec3(100);
          for (int i = 0; i < 5; ++i) {
              v += a * noise(x);
              x = x * 2.0 + shift;
              a *= 0.5;
          }
          return v;
      }

      mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c, -s, s, c); }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        
        // 화면 클릭 시 발생하는 파동(Shockwave) 연산
        float timeSinceClick = uTime - uClickTime;
        float wave = 0.0;
        vec2 clickUv = (uClickPos - 0.5) * (uResolution / min(uResolution.x, uResolution.y));
        float distToClick = length(uv - clickUv);
        
        if(timeSinceClick > 0.0 && timeSinceClick < 2.0) {
            float waveRadius = timeSinceClick * 2.0;
            float waveThickness = 0.1;
            wave = exp(-pow(distToClick - waveRadius, 2.0) * 100.0) * uClickIntensity * (1.0 - timeSinceClick/2.0);
            uv += normalize(uv - clickUv) * wave * 0.1; // 공간 일그러짐
        }

        vec3 ro = vec3(0.0, 0.0, 3.0);
        vec3 rd = normalize(vec3(uv, -1.0));
        
        // 배경 베이스 컬러 (데이/나이트 반응)
        vec3 colorA = uDarkMode > 0.5 ? vec3(0.1, 0.0, 0.2) : vec3(0.8, 0.85, 0.95);
        vec3 colorB = uDarkMode > 0.5 ? vec3(0.0, 0.2, 0.4) : vec3(0.9, 0.7, 0.8);
        
        // 좌우 클릭 위치에 따른 색상 시프트
        if(uClickPos.x < 0.5) colorA += vec3(wave * 0.5, 0.0, wave * 0.2); // 왼쪽 클릭 시 붉은/보라 톤 펄스
        else colorB += vec3(0.0, wave * 0.4, wave * 0.5); // 오른쪽 클릭 시 청/녹 톤 펄스

        float den = 0.0;
        float t = 0.0;
        
        // 간단한 볼류메트릭 레이마칭
        for(int i=0; i<30; i++) {
            vec3 p = ro + rd * t;
            p.xz *= rot(uTime * 0.1);
            p.xy *= rot(uTime * 0.05);
            float d = fbm(p * 1.5 + uTime * 0.2) - 0.5;
            if(d > 0.0) {
                den += d * 0.1;
            }
            t += 0.15;
        }

        vec3 finalColor = mix(colorA, colorB, uv.x + 0.5);
        finalColor += vec3(0.5, 0.7, 1.0) * den * (uDarkMode > 0.5 ? 1.0 : 0.5);
        
        // 클릭 파동 이펙트 오버레이
        finalColor += vec3(1.0, 0.8, 0.5) * wave * 2.0;

        gl_FragColor = vec4(finalColor, 1.0);
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

    const locTime = gl.getUniformLocation(program, 'uTime');
    const locRes = gl.getUniformLocation(program, 'uResolution');
    const locDark = gl.getUniformLocation(program, 'uDarkMode');
    const locClickTime = gl.getUniformLocation(program, 'uClickTime');
    const locClickPos = gl.getUniformLocation(program, 'uClickPos');
    const locClickInt = gl.getUniformLocation(program, 'uClickIntensity');
    const posLoc = gl.getAttribLocation(program, 'position');

    let animationId;
    const render = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      
      const time = performance.now() * 0.001;
      gl.uniform1f(locTime, time);
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locDark, isDarkMode ? 1.0 : 0.0);
      
      gl.uniform1f(locClickTime, clickDataRef.current.time);
      gl.uniform2f(locClickPos, clickDataRef.current.x, clickDataRef.current.y);
      gl.uniform1f(locClickInt, clickDataRef.current.intensity);

      // 서서히 클릭 강도 감소
      clickDataRef.current.intensity = Math.max(0, clickDataRef.current.intensity - 0.02);

      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('click', handleClick);
    };
  }, [isDarkMode]);

  // 🔥 코어 로직 완벽 유지 (이하 데이터 페칭 및 관리 함수)
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
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("aether-theme", (!isDarkMode).toString());
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
    const hasEnteredKey = `entered_${currentRoom}_${myName}`;
    if (!sessionStorage.getItem(hasEnteredKey)) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system", text: `${myName}님이 접속했습니다.`, createdAt: serverTimestamp()
      });
      sessionStorage.setItem(hasEnteredKey, 'true');
    }
    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      if (currentRoom && myName) {
        addDoc(collection(db, "rooms", currentRoom, "messages"), {
          type: "system", text: `${myName}님이 연결을 해제했습니다.`, createdAt: serverTimestamp()
        });
        sessionStorage.removeItem(hasEnteredKey);
      }
      unsubscribe();
    };
  }, [currentRoom, myName]);

  useEffect(() => {
    if (isUserAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  // 🎨 테마 설정 (Day/Night 완벽 분리 적용)
  const theme = {
    chatBg: isDarkMode ? "bg-transparent" : "bg-transparent",
    card: isDarkMode ? "bg-black/30 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-white/40 border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.15)]",
    textMain: isDarkMode ? "text-white" : "text-[#2c3e50]",
    textSub: isDarkMode ? "text-zinc-400" : "text-zinc-600",
    input: isDarkMode ? "bg-white/5 border border-white/10 text-white" : "bg-white/60 border border-white/50 text-[#2c3e50]",
    bubbleMe: "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg",
    bubbleOther: isDarkMode ? "bg-black/40 border border-white/10 text-zinc-200" : "bg-white/80 border border-white/40 text-zinc-800 shadow-sm",
  };

  // 🖥️ UI 렌더링
  if (!myName) return (
    <div className={`h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-700`}>
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-auto" />
      
      <div className={`${theme.card} p-12 w-full max-w-[460px] rounded-[40px] flex flex-col items-center gap-10 z-10 backdrop-blur-xl animate-in zoom-in duration-700 pointer-events-auto`}>
          <div className="flex flex-col items-center w-full">
            {/* 고채도 프리즘 로고 */}
            <h1 className="ULTRA_PRISM_TEXT text-[5.5rem] font-black italic tracking-tighter uppercase select-none mb-1">
              DOOLY
            </h1>
            <button onClick={toggleTheme} className={`${theme.textSub} text-[10px] font-bold uppercase tracking-[0.2em] hover:text-blue-500 transition-colors mt-2`}>
              {isDarkMode ? "Day Mode" : "Night Mode"}
            </button>
          </div>

          <form onSubmit={handleProfileSave} className="w-full flex flex-col items-center space-y-6">
            <div className={`w-28 h-28 rounded-full ${theme.input} overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group relative`} onClick={() => profileInputRef.current.click()}>
              {tempImg ? <img src={tempImg} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-[11px] font-bold tracking-widest group-hover:text-blue-500">PHOTO +</span>}
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="ENTER ID" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm font-bold tracking-widest backdrop-blur-md`} />
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[12px] shadow-lg active:scale-[0.98] transition-all">Start System</button>
          </form>
      </div>
      
      {/* 글로벌 스타일 */}
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        
        /* 채도 높은 하이엔드 글래스모피즘 프리즘 효과 */
        .ULTRA_PRISM_TEXT {
          background: linear-gradient(120deg, 
            #ff0055 0%, #ff5500 15%, #ffcc00 30%, 
            #00ff66 50%, #00ccff 70%, #7700ff 85%, #ff0055 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          position: relative;
          z-index: 1;
          animation: prismGlow 4s linear infinite;
        }
        .ULTRA_PRISM_TEXT::before {
          content: "DOOLY";
          position: absolute;
          left: 0; top: 0; z-index: -1;
          color: rgba(255,255,255, ${isDarkMode ? '0.3' : '0.8'});
          text-shadow: 0 4px 20px rgba(0,0,0,0.2), 
                       0 0 40px rgba(255,255,255, ${isDarkMode ? '0.2' : '0.5'});
          backdrop-filter: blur(5px);
          -webkit-text-stroke: 1px rgba(255,255,255,0.5);
        }
        @keyframes prismGlow {
          to { background-position: 200% center; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  if (!currentRoom) return (
    <div className={`h-screen flex items-center justify-center p-6 relative overflow-hidden transition-all duration-700`}>
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-auto" />
      <div className={`${theme.card} p-10 w-full max-w-[460px] rounded-[40px] flex flex-col items-center gap-8 z-10 backdrop-blur-xl animate-in fade-in zoom-in duration-500 pointer-events-auto`}>
          <div className="flex flex-col items-center w-full relative">
            <h1 className="ULTRA_PRISM_TEXT text-[3rem] font-black italic tracking-tighter uppercase select-none mb-6">DOOLY</h1>
            <img src={myProfileImg} className={`w-20 h-20 rounded-full object-cover shadow-xl border-2 ${isDarkMode ? 'border-white/20' : 'border-black/10'} mb-3`} />
            <p className={`${theme.textMain} font-black text-xl tracking-tight`}>{myName}</p>
            <div className="flex gap-4 mt-3">
               <button onClick={toggleTheme} className={`${theme.textSub} text-[9px] font-bold uppercase tracking-widest hover:text-blue-500 transition-all`}>{isDarkMode ? "Day Mode" : "Night Mode"}</button>
               <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>
          <div className="w-full flex flex-col h-[35vh]">
            <input onKeyDown={(e) => e.key === 'Enter' && joinRoom(e.currentTarget.value)} placeholder="SEARCH NODE (ENTER)" className={`w-full ${theme.input} px-6 py-4 rounded-xl text-center mb-6 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-xs font-bold tracking-widest backdrop-blur-md`} />
            <h2 className={`text-[10px] font-black text-left ${theme.textMain} tracking-widest uppercase mb-3 pl-2 opacity-70`}>My Nodes</h2>
            {myRooms.length === 0 && (
              <div className={`flex-1 flex items-center justify-center border border-dashed ${isDarkMode ? 'border-white/20' : 'border-black/20'} rounded-2xl`}>
                <span className={`${theme.textSub} text-[10px] font-bold`}>NO NODES FOUND</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {myRooms.map((roomName) => (
                <div key={roomName} className="relative group">
                  <button onClick={() => joinRoom(roomName)} className={`w-full ${theme.input} px-5 py-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.98] backdrop-blur-sm`}>
                    <span className={`font-black ${theme.textMain} text-sm tracking-tight`}>{roomName}</span>
                    <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Connect</span>
                  </button>
                  <button onClick={(e) => leaveRoom(e, roomName)} className="absolute -right-2 -top-2 w-6 h-6 bg-red-500/80 text-white rounded-full text-[9px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme.chatBg} transition-colors relative overflow-hidden`}>
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 pointer-events-auto" />
      
      {/* 헤더 */}
      <header className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'} flex justify-between items-center backdrop-blur-xl bg-inherit z-20`}>
        <div className="flex items-center gap-5">
          <button onClick={() => setCurrentRoom("")} className={`${theme.textSub} text-[10px] font-bold uppercase hover:text-blue-500 transition-colors`}>◀ EXIT</button>
          <div className="flex flex-col text-left gap-0.5">
            <h1 className="text-sm font-black italic text-blue-500 uppercase tracking-tighter">{currentRoom}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] ${theme.textMain} font-bold opacity-80`}>{myName}</span>
              <button onClick={() => { setTempName(myName); setTempImg(myProfileImg); setIsEditingProfile(!isEditingProfile); }} className={`text-[9px] ${theme.textSub} font-bold uppercase underline hover:text-blue-400`}>EDIT</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`text-[9px] font-black border ${isDarkMode ? 'border-white/20' : 'border-black/20'} ${theme.textSub} px-3 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all`}>
            {isDarkMode ? "DAY" : "NIGHT"}
          </button>
          <img src={myProfileImg} className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-sm" />
        </div>
      </header>

      {/* 프로필 수정 모달 */}
      {isEditingProfile && (
        <div className={`absolute top-[70px] left-0 w-full p-6 bg-black/20 backdrop-blur-2xl border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'} animate-in slide-in-from-top duration-300 z-30`}>
          <form onSubmit={handleProfileSave} className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden cursor-pointer border border-zinc-500 group" onClick={() => profileInputRef.current.click()}>
              <img src={tempImg || myProfileImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all" />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white">EDIT</span>
            </div>
            <input type="file" ref={profileInputRef} onChange={handleProfileImgUpload} accept="image/*" className="hidden" />
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} className={`flex-1 ${theme.input} px-4 py-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500/50 backdrop-blur-md`} placeholder="NEW ID" />
            <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">SAVE</button>
            <button type="button" onClick={() => setIsEditingProfile(false)} className={`${theme.textSub} text-[10px] font-bold px-2 hover:text-red-400`}>CANCEL</button>
          </form>
        </div>
      )}

      {/* 메시지 리스트 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide z-10 relative">
        {messages.map((m) => (
          m.type === "system" ? (
             <div key={m.id} className="flex justify-center my-2">
                <span className={`${theme.textSub} text-[10px] font-medium tracking-tight px-3 py-1 bg-transparent opacity-60`}>{m.text}</span>
             </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.userName === myName ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className={`w-8 h-8 rounded-full shrink-0 object-cover border ${isDarkMode ? 'border-white/20' : 'border-black/10'} shadow-sm`} />
              <div className={`flex flex-col ${m.userName === myName ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className={`${theme.textSub} text-[9px] font-bold mb-1.5 px-1 uppercase opacity-80 tracking-widest`}>{m.userName}</span>
                <div className={`group relative p-4 rounded-[20px] text-[13px] leading-relaxed backdrop-blur-md shadow-sm ${m.userName === myName ? theme.bubbleMe + ' rounded-tr-[4px]' : `${theme.bubbleOther} rounded-tl-[4px]`}`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 border border-white/10" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.userName === myName && (
                    <button onClick={() => deleteMsg(m.id)} className={`absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 text-[10px] font-bold transition-all`}>DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 전송 푸터 */}
      <footer className={`p-5 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'} z-20 backdrop-blur-xl bg-inherit`}>
        <form onSubmit={sendMessage} className={`max-w-5xl mx-auto flex items-center gap-3 ${theme.input} p-1.5 rounded-2xl focus-within:ring-1 focus-within:ring-blue-500/50 transition-all backdrop-blur-md`}>
          <button type="button" onClick={() => fileInputRef.current.click()} className={`w-10 h-10 flex items-center justify-center rounded-xl ${theme.textSub} hover:bg-white/10 transition-all`}>
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>sendMessage(null, r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className={`flex-1 bg-transparent px-2 text-sm ${theme.textMain} outline-none font-medium placeholder:opacity-50`} />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-blue-500/20 active:scale-95 transition-all">Send</button>
        </form>
      </footer>
    </div>
  );
}
