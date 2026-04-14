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

export default function AetherOSV3() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // ✨ 스마트 스크롤: 유저가 맨 아래를 보고 있는지 기억하는 변수
  const isUserAtBottom = useRef(true);

  // ✨ 스크롤 감지 함수
  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      // 바닥에서 150px 이내로 있으면 '바닥에 있다'고 판단
      isUserAtBottom.current = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 채팅방 입장 및 메시지 로드
  useEffect(() => {
    if (!currentRoom || !user) return;

    // 입장 알림 (한 번만)
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

  // ✨ 메시지가 업데이트될 때마다 스크롤 위치 결정
  useEffect(() => {
    if (isUserAtBottom.current) {
      // 유저가 바닥을 보고 있었다면 자동으로 내려줌
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => { signOut(auth); setCurrentRoom(""); };

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
    
    // 내가 보냈을 때는 무조건 화면을 바닥으로 고정
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
      const result = await model.generateContent(`이 디자인 프로젝트 대화를 요약해줘: \n${context}`);
      alert("🤖 AI BRIEFING:\n\n" + (await result.response).text());
    } catch (e) { alert("AI 연결 중..."); }
    setIsAiLoading(false);
  };

  if (!user) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-black italic text-blue-500 mb-8">AETHER OS.</h1>
      <button onClick={handleLogin} className="bg-white text-black px-8 py-4 rounded-2xl font-bold flex items-center gap-3">
        Google 계정으로 시작하기
      </button>
    </div>
  );

  if (!currentRoom) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
      <div className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-center text-zinc-400 mb-6">PROJECT ROOM</h2>
        <input 
          onKeyDown={(e) => e.key === 'Enter' && setCurrentRoom(e.currentTarget.value)}
          placeholder="방 이름을 입력하세요 (예: 디자인-A)" 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">Enter를 누르면 방이 생성되거나 입장합니다</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-white overflow-hidden">
      <header className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentRoom("")} className="text-zinc-500 hover:text-white text-xs">◀ 뒤로</button>
          <div>
            <h1 className="text-xs font-black italic text-blue-500 uppercase">{currentRoom}</h1>
            <p className="text-[9px] text-zinc-600">{user.displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAiSummary} className="bg-blue-600/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 text-[10px] font-bold">AI 요약</button>
          <button onClick={handleLogout} className="bg-zinc-900 text-zinc-600 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px]">로그아웃</button>
        </div>
      </header>

      {/* ✨ onScroll 이벤트가 추가된 대화창 영역 */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 space-y-6">
        {messages.map((m) => (
          m.type === "system" ? (
            <div key={m.id} className="flex justify-center">
              <span className="bg-zinc-900/50 text-zinc-600 text-[10px] px-3 py-1 rounded-full border border-zinc-800/50">{m.text}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex gap-3 ${m.uid === user.uid ? 'flex-row-reverse' : ''}`}>
              <img src={m.userPhoto} className="w-7 h-7 rounded-full mt-1 opacity-80" />
              <div className={`flex flex-col ${m.uid === user.uid ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-zinc-600 font-bold mb-1 uppercase tracking-wider">{m.userName}</span>
                <div className={`group relative p-3.5 rounded-2xl text-[13px] ${
                  m.uid === user.uid ? 'bg-blue-600 rounded-tr-none' : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
                }`}>
                  {m.image && <img src={m.image} className="max-w-[220px] rounded-xl mb-2" />}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {m.uid === user.uid && (
                    <button onClick={() => deleteMsg(m.id)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 text-[10px]">삭제</button>
                  )}
                </div>
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/60 border-t border-zinc-900/30">
        <div className="flex items-center gap-2 max-w-5xl mx-auto bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
          <button type="button" onClick={() => fileInputRef.current.click()} className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl">+</button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files[0];
            if(f) { const r = new FileReader(); r.onloadend = () => sendMessage(null, r.result); r.readAsDataURL(f); }
          }} accept="image/*" className="hidden" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="메시지 입력..." className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none" />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs">SEND</button>
        </div>
      </form>
    </div>
  );
}
