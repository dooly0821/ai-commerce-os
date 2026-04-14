"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
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
const genAI = new GoogleGenerativeAI("AIzaSyCSFPBsziw2QX5eAZoUYtMKGeF1XaVfccI");

export default function AetherSmartApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState("");
  const messagesEndRef = useRef(null);

  // 1. 스크롤 함수 (살짝의 시간차를 두어 확실하게 내립니다)
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    // 2. 닉네임 기억하기 로직
    const savedName = localStorage.getItem("aether-username");
    if (savedName) {
      setMyDisplayName(savedName);
    } else {
      const name = prompt("사용하실 이름을 입력해주세요!");
      const finalName = name || "익명";
      setMyDisplayName(finalName);
      localStorage.setItem("aether-username", finalName);
    }

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 메시지가 바뀔 때마다 스크롤 아래로
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: input,
        user: myDisplayName,
        createdAt: serverTimestamp()
      });
      setInput("");
      scrollToBottom(); // 전송 후에도 한 번 더!
    } catch (e) { console.error(e); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("🔗 메신저 주소가 복사되었습니다!");
  };

  const handleAiSummary = async () => {
    if (messages.length === 0) return alert("데이터가 없습니다.");
    setIsAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const conversation = messages.map(m => `${m.user}: ${m.text}`).join("\n");
      const prompt = `너는 수석 디자이너 민혁의 AI 비서야. 대화 내용을 세련되게 요약해줘: \n\n ${conversation}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      alert("✨ AI 디자인 브리핑:\n" + response.text());
    } catch (err) { alert("AI 연결 중..."); }
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <header className="p-5 border-b border-zinc-900 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-blue-500 italic">AETHER LAB.</h1>
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">User: {myDisplayName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-zinc-800">SHARE</button>
          <button onClick={handleAiSummary} disabled={isAiLoading} className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg shadow-blue-500/20">
            {isAiLoading ? "..." : "AI SUMMARY"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.user === myDisplayName ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] text-zinc-600 mb-1 font-bold px-1">{m.user}</span>
            <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-xl ${
              m.user === myDisplayName 
              ? 'bg-blue-600 rounded-tr-none' 
              : 'bg-zinc-900 border border-zinc-800 rounded-tl-none text-zinc-300'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {/* 스크롤 포인트 */}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <form onSubmit={sendMessage} className="p-5 bg-black/50 backdrop-blur-md border-t border-zinc-900/50">
        <div className="flex gap-2 max-w-4xl mx-auto bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 transition-all">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="팀원과 아이디어를 공유하세요..." 
            className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none" 
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-blue-500 active:scale-95 transition-all">SEND</button>
        </div>
      </form>
    </div>
  );
}
