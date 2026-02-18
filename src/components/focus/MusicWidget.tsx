import React, { useState, useCallback } from "react";
import { Volume2, VolumeX, Music, Video } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import DraggableWidget from "./DraggableWidget";
import { Slider } from "@/components/ui/slider";

type AudioTab = "video" | "music";

const MusicWidget = () => {
  const { spotifyUrl, setSpotifyUrl } = useFocusStore();
  const [spotifyInput, setSpotifyInput] = useState(spotifyUrl);
  const [tab, setTab] = useState<AudioTab>("video");

  const [masterVolume, setMasterVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("flux-yt-volume") || "0"); } catch { return 0; }
  });

  const handleMasterVolume = useCallback((v: number) => {
    setMasterVolume(v);
    localStorage.setItem("flux-yt-volume", String(v));
    window.dispatchEvent(new CustomEvent("flux-yt-volume-change", { detail: v }));
  }, []);

  const getEmbedUrl = (url: string) => {
    const spotifyMatch = url.match(/spotify\.com\/(playlist|album|track|episode|show)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}?theme=0`;
    const appleMatch = url.match(/music\.apple\.com\/([a-z]{2})\/(album|playlist|station)\/([^?]+)/);
    if (appleMatch) return `https://embed.music.apple.com/${appleMatch[1]}/${appleMatch[2]}/${appleMatch[3]}`;
    return "";
  };

  return (
    <DraggableWidget
      id="music"
      title="Audio"
      defaultPosition={{ x: 420, y: 380 }}
      defaultSize={{ w: 320, h: 300 }}
    >
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-4">
        <button
          onClick={() => setTab("video")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "video" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Video size={13} /> Video Audio
        </button>
        <button
          onClick={() => setTab("music")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "music" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          <Music size={13} /> Music
        </button>
      </div>

      {tab === "video" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70 font-semibold">🔊 Video Audio</span>
            <span className="text-[10px] text-white/30 tabular-nums">{Math.round(masterVolume * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMasterVolume(masterVolume > 0 ? 0 : 0.5)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              {masterVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <Slider
              value={[masterVolume]}
              onValueChange={([v]) => handleMasterVolume(v)}
              max={1}
              step={0.01}
              className="[&_[data-radix-slider-track]]:bg-white/10 [&_[data-radix-slider-range]]:bg-white/30 [&_[data-radix-slider-thumb]]:bg-white [&_[data-radix-slider-thumb]]:border-white/40 [&_[data-radix-slider-thumb]]:w-3.5 [&_[data-radix-slider-thumb]]:h-3.5"
            />
          </div>
          <p className="text-[10px] text-white/25 leading-relaxed">
            Controls the ambient audio from the active YouTube background video. Drag the slider to hear the scene.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={spotifyInput}
            onChange={(e) => setSpotifyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSpotifyUrl(spotifyInput); }}
            onBlur={() => setSpotifyUrl(spotifyInput)}
            placeholder="Paste Spotify or Apple Music URL..."
            className="w-full bg-white/5 border border-white/15 rounded-lg text-white text-xs px-3 py-2 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/30"
          />
          {getEmbedUrl(spotifyUrl) ? (
            <iframe
              src={getEmbedUrl(spotifyUrl)}
              width="100%"
              height="152"
              allow="encrypted-media; autoplay; clipboard-write"
              className="rounded-xl"
              style={{ border: 0 }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-white/30">
              <Music size={28} className="mb-2 opacity-40" />
              <p className="text-xs text-center">
                Paste a Spotify or Apple Music link<br />
                to embed your playlist here
              </p>
            </div>
          )}
        </div>
      )}
    </DraggableWidget>
  );
};

export default MusicWidget;
