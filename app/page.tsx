"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app"; 
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD9-u-Qz2EWRDAzr7NAuUE6I7sGyCP0Cdc",
  authDomain: "dooly-66736.firebaseapp.com",
  projectId: "dooly-66736",
  storageBucket: "dooly-66736.firebasestorage.app",
  messagingSenderId: "969360298710",
  appId: "1:969360298710:web:1c09f676b9d784a0bdaf77"
};

// 중복 초기화 방지 및 서비스 연결
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 🚨 AI 키 설정: 여기에 민혁님이 발급받은 새 API 키를 꼭 붙여넣으세요!
const YOUR_AI_KEY = "발급받으신_새_API_키를_여기에_넣으세요"; 
const genAI = new GoogleGenerativeAI(YOUR_AI_KEY);

export default function AetherOS_Final() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const scrollRef = useRef(null); 
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const isUserAtBottom = useRef(true); 

  // 스크롤 감지 센서 (과거 내용 읽을 때 튀지 않게 함)
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

  // 채팅방 입장 및 메시지 실시간 로드
  useEffect(() => {
    if (!currentRoom || !user) return;

    // 입장 알림 1회 전송
    const hasEnteredKey = `entered_${currentRoom}_${user.uid}`;
    const hasEntered = sessionStorage.getItem(hasEnteredKey);

    if (!hasEntered) {
      addDoc(collection(db, "rooms", currentRoom, "messages"), {
        type: "system",
        text: `${user.displayName}님이 입장하셨습니다.`,
        createdAt: serverTimestamp()
      });
      sessionStorage.setItem(hasEnteredKey, 'true');
    }

    const q = query(collection(db, "rooms", currentRoom, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(newMsgs);
    });
    return () => unsubscribe();
  }, [currentRoom, user]);

  // 메시지 업데이트 시 스크롤 처리
  useEffect(() => {
    if (isUserAtBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => { signOut(auth); setCurrentRoom(""); sessionStorage.clear(); };

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
    if (confirm("메시지를 삭제하시겠습니까?")) await deleteDoc(doc(db, "rooms", currentRoom, "messages", id));
  };

  const handleAiSummary = async () => {
    const chatMessages = messages.filter(m => m.type === "chat");
    if (chatMessages.length === 0) return alert("AI가 요약할 대화 내용이 아직 없습니다.");

    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const context = chatMessages.slice(-20).map(m => `${m.userName}: ${m.text}`).join("\n");
      const result = await model.generateContent(`수석 디자이너의 관점에서 이 프로젝트 대화를 분석하고 3줄로 요약해줘: \n${context}`);
      alert("🤖 AI BRIEFING:\n\n" + (await result.response).text());
    } catch (e) { 
      console.error(e);
      alert("🚨 AI 연결 실패! 발급받으신 API 키가 코드에 제대로 입력되었는지 확인해 주세요. (에러: " + e.message + ")"); 
    }
    setIsAiLoading(false);
  };

  const handlePopupMode = () => {
    const width = 380;
    const height = 650;
    const left = window.screen.width - width - 20; 
    const top = 50;
    window.open(window.location.href, '_blank', `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no`);
  };

  if (!user) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10 text-center">
      <h1 className="text-5xl font-black italic text-blue-500 mb-2 tracking-tighter">AETHER LAB.</h1>
      <p className="text-zinc-600 text-[10px] mb-12 uppercase tracking-[0.4em] font-bold">Design Intelligence Network</p>
      <button onClick={handleLogin} className="bg-white text-black px-10 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-500/10">
        <img src="https://www.gstatic.com/firebase/anonymous/google.png" className="w-5" alt="google" />
        Google 계정으로 시작하기
      </button>
    </div>
  );

  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-xl font-bold text-center text-zinc-400 tracking-widest uppercase">Project Node</h2>
        <input 
          onKeyDown={(e) => e.key === 'Enter' && setCurrentRoom(e.currentTarget.value)}
          placeholder="방 이름을 입력하세요..." 
          className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-center transition-all"
        />
        <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">Press Enter to Connect</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden font-sans">
      <header className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-500 hover:text-blue-500 text-[10px] font-bold uppercase transition-colors">◀ EXIT</button>
          <div>
            <h1 className="text-xs font-black italic text-blue-500 uppercase tracking-tight">{currentRoom} OS.</h1>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">{user.displayName}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleAiSummary} className="bg-blue-600/10 text-blue-400 px-3 py-2 rounded-xl border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black">AI</button>
          <button onClick={handlePopupMode} className="bg-zinc-900 text-zinc-400 px-3 py-2 rounded-xl border border-zinc-800 text-[10px] font-black hover:bg-zinc-800 transition-all">POPUP</button>
          <button onClick={handleLogout} className="bg-zinc-900 text-zinc-700 px-3 py-2 rounded-xl border border-zinc-800 text-[10px] font-black hover:text-red-500 transition-all">OFF</button>
        </div>
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className="bg-zinc-900/30 text-zinc-700 text-[9px] px-3 py-1 rounded-full border border-zinc-800/30 font-bold uppercase tracking-tighter">{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.uid === user.uid ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-7 h-7 rounded-full mt-1 opacity-80 shrink-0 border border-zinc-800" alt="profile" />
              <div className={`flex flex-col ${m.uid === user.uid ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <span className="text-[9px] text-zinc-600 font-black mb-1 uppercase tracking-widest px-1">{m.userName}</span>
                <div className={`group relative p-4 rounded-[1.25rem] text-[13px] leading-relaxed shadow-2xl transition-all ${
                  m.uid === user.uid ? 'bg-blue-600 rounded-tr-none shadow-blue-900/20 text-white' : 'bg-zinc-900/80 border border-zinc-800 rounded-tl-none text-zinc-300'
                }`}>
                  {m.image && <img src={m.image} className="w-full rounded-xl mb-3 border border-black/20" alt="upload" />}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.uid === user.uid && (
                    <button onClick={() => deleteMsg(m.id)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-800 hover:text-red-500 text-[10px] font-bold transition-all p-1">DEL</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/30 shrink-0">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 transition-all">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-all shrink-0">
            <span className="text-xl font-light">+</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); }
          }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none min-w-0" />
          <button type="submit" className="bg-blue-600 text-white px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/20 shrink-0">SEND</button>
        </div>
      </form>
    </div>
  );
}
