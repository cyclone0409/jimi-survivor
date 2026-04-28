"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const HOME_BGM_SOURCES = ["/audio/home-bgm.wav", "/audio/home-bgm.m4a", "/audio/home-bgm.mp3"];

function createAudioWithFallback(sources: string[]) {
  const audio = document.createElement("audio");
  for (const src of sources) {
    const source = document.createElement("source");
    source.src = src;
    source.type = src.endsWith(".wav") ? "audio/wav" : src.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
    audio.appendChild(source);
  }
  return audio;
}

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = createAudioWithFallback(HOME_BGM_SOURCES);
    audio.loop = true;
    audio.volume = 0.42;
    audio.preload = "auto";
    audioRef.current = audio;

    const play = () => audio.play().catch(() => undefined);
    play();
    window.addEventListener("pointerdown", play, { once: true });
    window.addEventListener("keydown", play, { once: true });

    return () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#050712] px-6 py-6 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-[0.08em] text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)] sm:text-5xl">
          基米幸存者
        </h1>
        <p className="mt-4 text-sm text-slate-300 sm:text-base">自动攻击、拾取经验、升级技能，尽可能存活更久。</p>
        <p className="mt-2 text-xs text-yellow-100/80 sm:text-sm">手机游玩建议横屏，进入游戏后使用左下角摇杆移动。</p>
        <Link
          href="/game"
          onClick={() => audioRef.current?.pause()}
          className="mt-8 inline-flex min-h-12 items-center rounded border border-cyan-300/70 bg-cyan-300/10 px-8 py-3 text-base font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300/20"
        >
          开始游戏
        </Link>
      </div>
    </main>
  );
}
