// Offline Download Manager
export interface DownloadedTrack {
    id: string;
    title: string;
    reciterName: string;
    audioUrl: string;
    surahNumber?: number;
    downloadedAt: number;
    size?: number;
}

const DOWNLOADS_KEY = 'offline-downloads';
const PENDING_KEY = 'pending-downloads';

export function getPendingDownloads(): Record<string, DownloadedTrack> {
    try {
        const stored = localStorage.getItem(PENDING_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

export function addPendingDownload(track: DownloadedTrack): void {
    const pending = getPendingDownloads();
    pending[track.audioUrl] = track;
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function removePendingDownload(url: string): DownloadedTrack | null {
    const pending = getPendingDownloads();
    const track = pending[url] || null;
    if (track) {
        delete pending[url];
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    }
    return track;
}

export function getDownloadedTracks(): DownloadedTrack[] {
    try {
        const stored = localStorage.getItem(DOWNLOADS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function isTrackDownloaded(trackId: string): boolean {
    const downloads = getDownloadedTracks();
    return downloads.some(t => t.id === trackId);
}

export function addDownloadedTrack(track: DownloadedTrack): void {
    const downloads = getDownloadedTracks();
    const filtered = downloads.filter(t => t.id !== track.id);
    filtered.push(track);
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));
}

export function removeDownloadedTrack(trackId: string): void {
    const downloads = getDownloadedTracks();
    const filtered = downloads.filter(t => t.id !== trackId);
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));
}

export function clearAllDownloads(): void {
    localStorage.removeItem(DOWNLOADS_KEY);
}

const AUDIO_CACHE_NAME = 'audio-v1';

/**
 * Start download in background and return immediately.
 * File will continue caching via Service Worker as it plays.
 */
export async function downloadAudioForOffline(url: string): Promise<boolean> {
    if (!('caches' in window)) {
        console.error('[DownloadManager] Cache API not supported');
        return false;
    }

    try {
        console.log(`[DownloadManager] Starting download: ${url}`);

        const cache = await caches.open(AUDIO_CACHE_NAME);
        const existing = await cache.match(url);
        if (existing) {
            console.log('[DownloadManager] ✓ Already in cache');
            return true;
        }

        console.log('[DownloadManager] Initiating background download...');

        const audio = new Audio(url);
        audio.volume = 0;
        audio.playbackRate = 16;
        audio.preload = 'auto';

        return new Promise((resolve) => {
            let resolved = false;

            // Return success as soon as playback starts
            audio.addEventListener('playing', () => {
                if (!resolved) {
                    resolved = true;
                    console.log('[DownloadManager] ✓ Download started successfully!');
                    console.log('[DownloadManager] File will continue caching in background...');
                    resolve(true);

                    // Log progress periodically
                    const logProgress = () => {
                        if (audio.paused || audio.ended) return;
                        const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
                        if (percent > 0) {
                            console.log(`[DownloadManager] Background progress: ${percent.toFixed(0)}%`);
                        }
                        if (!audio.ended) setTimeout(logProgress, 10000); // Every 10s
                    };
                    setTimeout(logProgress, 10000);
                }
            }, { once: true });

            audio.addEventListener('error', (e) => {
                if (!resolved) {
                    resolved = true;
                    console.error('[DownloadManager] ✗ Failed:', e);
                    audio.src = '';
                    resolve(false);
                }
            }, { once: true });

            audio.addEventListener('loadedmetadata', () => {
                console.log(`[DownloadManager] File duration: ${(audio.duration / 60).toFixed(1)} minutes`);
                audio.play().catch(err => {
                    if (!resolved) {
                        resolved = true;
                        console.error('[DownloadManager] Play error:', err);
                        audio.src = '';
                        resolve(false);
                    }
                });
            }, { once: true });

            audio.addEventListener('ended', () => {
                console.log('[DownloadManager] ✓ Background download complete!');

                // Dispatch custom event for UI notification
                window.dispatchEvent(new CustomEvent('downloadComplete', {
                    detail: { url }
                }));
            }, { once: true });

            audio.load();

            // Timeout if doesn't start within 30s
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.warn('[DownloadManager] ✗ Timeout');
                    audio.pause();
                    audio.src = '';
                    resolve(false);
                }
            }, 30000);
        });

    } catch (error) {
        console.error('[DownloadManager] Error:', error);
        return false;
    }
}

export async function deleteAudioFromCache(url: string): Promise<boolean> {
    if (!('caches' in window)) return false;

    try {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const result = await cache.delete(url);
        console.log(`[DownloadManager] Deleted: ${result}`);
        return result;
    } catch (error) {
        console.error('[DownloadManager] Delete error:', error);
        return false;
    }
}

export async function getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0;

    try {
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const requests = await cache.keys();

            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    // Try to get size from Content-Length header first (faster)
                    const contentLength = response.headers.get('Content-Length');
                    if (contentLength) {
                        totalSize += parseInt(contentLength, 10);
                    } else {
                        // Fallback: read blob (slower for large files)
                        try {
                            const blob = await response.blob();
                            totalSize += blob.size;
                        } catch (e) {
                            console.warn('[getCacheSize] Failed to read blob:', e);
                        }
                    }
                }
            }
        }

        return totalSize;
    } catch (e) {
        console.error('[getCacheSize] Error:', e);
        return 0;
    }
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
