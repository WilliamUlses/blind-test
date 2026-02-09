'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface SharePanelProps {
  roomCode: string;
}

export function SharePanel({ roomCode }: SharePanelProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lobby/${roomCode}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = joinUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Blind Test - Room ${roomCode}`,
          text: 'Rejoins ma partie de Blind Test !',
          url: joinUrl,
        });
      } catch {
        // User cancelled or share failed, ignore
      }
    }
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-4">
      <h2 className="text-white/60 text-sm font-bold uppercase tracking-widest">
        Invite Friends
      </h2>

      {/* Room Code Display */}
      <div className="text-center py-2">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Room Code</p>
        <p className="font-display text-3xl font-black text-white tracking-wider">{roomCode}</p>
      </div>

      {/* QR Code Toggle */}
      <button
        onClick={() => setShowQR(!showQR)}
        className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
      >
        {showQR ? 'Hide QR Code' : 'Show QR Code'}
      </button>

      {showQR && joinUrl && (
        <div className="flex justify-center py-3">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG
              value={joinUrl}
              size={160}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyLink}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            copied
              ? 'bg-green-500 text-black'
              : 'bg-primary/20 text-primary hover:bg-primary/30'
          }`}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>

        {canShare && (
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-primary text-white hover:bg-primary/90"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
