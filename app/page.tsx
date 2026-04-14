"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const genAI = new GoogleGenerativeAI("AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI");

export default function AetherOS_Ultimate() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPopup, setIsPopup] = useState(false); // ✨ 팝업 상태 추가!
  
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isUserAtBottom = useRef(true);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      isUserAtBottom.current = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentRoom || !user) return;

    const sendEnterMsg = async () => {
      await addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system",
        text: `${user.displayName}님이 입장하셨습니다.`,
        createdAt: serverTimestamp()
      });
    };
    sendEnterMsg();

    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(newMsgs);
    });
    return () => unsubscribe();
  }, [currentRoom, user]);

  useEffect(() => {
    if (isUserAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => { signOut(auth); setCurrentRoom(""); setIsPopup(false); };

  const sendMessage = async (e, img = null) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !img) || !user) return;
    
    await addDoc(collection(db, "rooms", currentRoom, "messages"), {
      text: input,
      image: img,
      uid: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      type: "chat",
      createdAt: serverTimestamp()
    });
    setInput("");
    isUserAtBottom.current = true;
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const deleteMsg = async (id) => {
    if (confirm("삭제할까요?")) await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
  };

  const handleAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const context = messages.filter(m => m.type === "chat").slice(-20).map(m => `${m.userName}: ${m.text}`).join("\n");
      const result = await model.generateContent(`수석 디자이너의 관점에서 이 프로젝트 대화를 3줄로 요약해줘: \n${context}`);
      alert("🤖 AI BRIEFING:\n\n" + (await result.response).text());
    } catch (e) { alert("AI 연결 중..."); }
    setIsAiLoading(false);
  };

  if (!user) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <h1 className="text-5xl font-black italic text-blue-500 mb-2 tracking-tighter">AETHER LAB.</h1>
      <p className="text-zinc-600 text-[10px] mb-12 uppercase tracking-[0.4em] font-bold">Design Intelligence Network</p>
      <button onClick={handleLogin} className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all">
        <img src="https://www.gstatic.com/firebase/anonymous/google.png" className="w-5" alt="google" />
        Google 계정으로 시작하기
      </button>
    </div>
  );

  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <div className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-center text-zinc-400 mb-6 tracking-widest">PROJECT ROOM</h2>
        <input 
          onKeyDown={(e) => e.key === 'Enter' && setCurrentRoom(e.currentTarget.value)}
          placeholder="방 이름을 입력하세요 (예: 디자인-A)" 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
        />
        <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">Enter를 누르면 방이 생성되거나 입장합니다</p>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col bg-[#080808] text-white transition-all duration-500 ${
      isPopup 
      ? 'fixed bottom-5 right-5 w-[360px] h-[600px] rounded-[2.5rem] border border-blue-500/30 z-[9999] shadow-2xl overflow-hidden' 
      : 'h-screen w-full'
    }`}>
      {/* HEADER */}
      <header className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-500 hover:text-white text-xs">◀ 뒤로</button>
          <div className="overflow-hidden">
            <h1 className={`font-black italic text-blue-500 uppercase truncate max-w-[100px] ${isPopup ? 'text-[10px]' : 'text-xs'}`}>{currentRoom}</h1>
            <p className="text-[9px] text-zinc-600 truncate">{user.displayName}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleAiSummary} className="bg-blue-600/10 text-blue-400 p-2 rounded-xl border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all">
            <span className="text-[10px] font-bold px-1">AI</span>
          </button>
          {/* ✨ 팝업 모드 전환 버튼 */}
          <button onClick={() => setIsPopup(!isPopup)} className="bg-zinc-900 text-zinc-400 p-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all">
            <span className="text-[10px] font-bold px-1">{isPopup ? "FULL" : "POPUP"}</span>
          </button>
          <button onClick={handleLogout} className="bg-zinc-900 text-zinc-600 p-2 rounded-xl border border-zinc-800 hover:text-red-500 transition-all">
            <span className="text-[10px] font-bold px-1">OFF</span>
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className="bg-zinc-900/50 text-zinc-500 text-[9px] px-3 py-1 rounded-full border border-zinc-800/50">{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-2.5 ${m.uid === user.uid ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-6 h-6 rounded-full mt-1 opacity-80 shrink-0" alt="profile" />
              <div className={`flex flex-col ${m.uid === user.uid ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className="text-[8px] text-zinc-600 font-bold mb-1 uppercase tracking-wider px-1">{m.userName}</span>
                <div className={`group relative p-3 rounded-2xl text-[13px] leading-relaxed ${
                  m.uid === user.uid ? 'bg-blue-600 rounded-tr-none shadow-lg shadow-blue-900/20' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
                }`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-2" alt="upload" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.uid === user.uid && (
                    <button onClick={() => deleteMsg(m.id)} className="absolute -left-9 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 text-[9px] transition-all bg-black/50 px-2 py-1 rounded">DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-3 bg-black/40 border-t border-zinc-900/30 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 transition-all">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-9 h-9 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 shrink-0">
            <span className="text-lg font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); }
          }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="메시지..." className="flex-1 bg-transparent px-2 py-1.5 text-sm focus:outline-none min-w-0" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 active:scale-95 shrink-0 shadow-lg shadow-blue-500/20">SEND</button>
        </div>
      </form>
    </div>
  );
}
