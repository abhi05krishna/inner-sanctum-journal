import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Music } from 'lucide-react';

export const SpotifyCallbackHandler: React.FC = () => {
  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const exchange = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setErrorMessage(`Spotify authorization was denied: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setErrorMessage('No authorization code provided in callback.');
          return;
        }

        const storedUserId = sessionStorage.getItem('spotify_auth_userId') || 'spotify-authenticated-user';
        const redirectUri = `${window.location.origin}/spotify-callback`;
        const res = await fetch('/api/spotify/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri,
            userId: storedUserId,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to exchange token with backend.');
        }

        setStatus('success');

        // Notify parent opener window
        if (window.opener) {
          window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS' }, window.location.origin);
          setTimeout(() => {
            window.close();
          }, 1200);
        } else {
          // If not in popup, redirect back to main app
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } catch (err: any) {
        console.error('Spotify callback processing error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'An error occurred during authentication.');
      }
    };

    exchange();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] p-4 text-[#1A1A1A]">
      <div className="w-full max-w-sm rounded-2xl border border-[#DCD7C5] bg-[#FDFCF9] p-6 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1DB954] text-white shadow-sm mb-4">
          <Music className="h-6 w-6" />
        </div>

        <h2 className="font-serif font-semibold text-lg text-[#1A1A1A]">
          Spotify Authorization
        </h2>

        {status === 'exchanging' && (
          <div className="mt-4 flex flex-col items-center gap-2 text-xs text-[#7C786A]">
            <Loader2 className="h-5 w-5 animate-spin text-[#1DB954]" />
            <p>Connecting your Spotify account safely...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 flex flex-col items-center gap-2 text-xs text-[#2D4A3E]">
            <CheckCircle2 className="h-5 w-5 text-[#1DB954]" />
            <p className="font-medium">Successfully connected! Closing window...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 flex flex-col items-center gap-2 text-xs text-[#8A381E]">
            <AlertCircle className="h-5 w-5 text-[#8A381E]" />
            <p className="font-medium">{errorMessage}</p>
            <button
              onClick={() => window.close()}
              className="mt-3 rounded-lg border border-[#DCD7C5] bg-white px-3 py-1.5 text-xs text-[#1A1A1A] hover:bg-[#F0ECE1]"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
