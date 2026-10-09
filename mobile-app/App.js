import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  const [query, setQuery] = useState('top hits 2025');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedIds, setLikedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'liked' | 'connect'
  const soundRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    searchMusic('top hits 2025');
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  async function searchMusic(searchTerm) {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      // Fetch both Full-Length 320kbps tracks (JioSaavn API) and Global Catalog (iTunes API)
      const [saavnRes, itunesRes] = await Promise.all([
        fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(searchTerm)}&limit=12`)
          .then((r) => r.json())
          .catch(() => ({})),
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=12`)
          .then((r) => r.json())
          .catch(() => ({})),
      ]);

      const saavnTracks = (saavnRes?.data?.results || []).map((item) => {
        const imgs = item.image || [];
        const dls = item.downloadUrl || [];
        return {
          id: 'saavn_' + item.id,
          title: (item.name || 'Untitled').replace(/&quot;/g, '"'),
          artist: item.artists?.primary?.map((a) => a.name).join(', ') || 'Artist',
          artwork: (imgs[imgs.length - 1]?.url || '').replace('http://', 'https://'),
          streamUrl: (dls[dls.length - 1]?.url || '').replace('http://', 'https://'),
          badge: '320kbps FULL',
        };
      }).filter((t) => t.streamUrl);

      const itunesTracks = (itunesRes?.results || []).filter((r) => r.previewUrl).map((r) => ({
        id: 'itunes_' + r.trackId,
        title: r.trackName,
        artist: r.artistName,
        artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        streamUrl: r.previewUrl,
        badge: 'GLOBAL AAC',
      }));

      setTracks([...saavnTracks, ...itunesTracks]);
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function playTrack(track) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      setCurrentTrack(track);
      setIsPlaying(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            playNextTrack(track);
          }
        }
      );
      soundRef.current = sound;
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  async function togglePlayPause() {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }

  function playNextTrack(fromTrack = currentTrack) {
    if (!tracks.length || !fromTrack) return;
    const idx = tracks.findIndex((t) => t.id === fromTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) playTrack(next);
  }

  function toggleLike(track) {
    setLikedIds((prev) =>
      prev.some((t) => t.id === track.id)
        ? prev.filter((t) => t.id !== track.id)
        : [track, ...prev]
    );
  }

  function openInSpotify(track) {
    const t = track || currentTrack || { title: 'Starboy', artist: 'The Weeknd' };
    const q = encodeURIComponent(`${t.title} ${t.artist}`);
    Linking.openURL(`https://open.spotify.com/search/${q}`);
  }

  async function shareCurrentTrack() {
    if (!currentTrack) return;
    await Share.share({
      message: `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on PulseBeats! https://open.spotify.com/search/${encodeURIComponent(currentTrack.title + ' ' + currentTrack.artist)}`,
    });
  }

  const displayedTracks = activeTab === 'liked' ? likedIds : tracks;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07080d" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>🎵 Balu Beats</Text>
          <Text style={styles.subText}>IG: @being_rebel__7 • 𝔓𝔯𝔞𝔳𝔢𝔢𝔫</Text>
        </View>
        <TouchableOpacity style={styles.spotifyBtn} onPress={() => Linking.openURL('https://www.instagram.com/being_rebel__7/')}>
          <Text style={styles.spotifyBtnText}>📸 @being_rebel__7</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => searchMusic(query)}
          placeholder="Search songs, artists, or albums..."
          placeholderTextColor="#636b85"
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchGoBtn} onPress={() => searchMusic(query)}>
          <Text style={styles.searchGoText}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {activeTab === 'connect' ? (
        <View style={styles.connectBox}>
          <Text style={styles.connectTitle}>🔗 Connect to External Music Apps</Text>
          <Text style={styles.connectDesc}>
            Open your currently playing track directly in Spotify, YouTube Music, or Apple Music, or share it with friends:
          </Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openInSpotify(currentTrack)}>
            <Text style={styles.actionBtnText}>🟢 Open Current Track in Spotify App</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1e2235' }]}
            onPress={() => {
              const t = currentTrack || { title: 'Starboy', artist: 'The Weeknd' };
              Linking.openURL(`https://music.youtube.com/search?q=${encodeURIComponent(t.title + ' ' + t.artist)}`);
            }}
          >
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>🔴 Open in YouTube Music</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1e2235' }]}
            onPress={shareCurrentTrack}
          >
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>📲 Share Current Song Link</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#1ed760" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayedTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 14 }}
          renderItem={({ item }) => {
            const active = currentTrack?.id === item.id;
            const liked = likedIds.some((t) => t.id === item.id);
            return (
              <TouchableOpacity
                style={[styles.trackRow, active && styles.trackRowActive]}
                onPress={() => playTrack(item)}
              >
                <Image source={{ uri: item.artwork }} style={styles.thumb} />
                <View style={styles.trackMeta}>
                  <Text style={[styles.trackTitle, active && { color: '#1ed760' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackSub} numberOfLines={1}>
                    [{item.badge}] • {item.artist}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => toggleLike(item)} style={styles.iconHit}>
                  <Text style={{ fontSize: 18, color: liked ? '#ec4899' : '#9ca3bd' }}>
                    {liked ? '♥' : '♡'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openInSpotify(item)} style={styles.iconHit}>
                  <Text style={{ fontSize: 13, color: '#1ed760', fontWeight: '700' }}>↗</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Mini Player Bar */}
      {currentTrack && (
        <View style={styles.miniPlayer}>
          <Image source={{ uri: currentTrack.artwork }} style={styles.miniThumb} />
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause}>
            <Text style={styles.playBtnText}>{isPlaying ? '❚❚' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => playNextTrack()}>
            <Text style={{ color: '#fff', fontSize: 16 }}>⏭</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Tabs */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => setActiveTab('stream')} style={styles.navBtn}>
          <Text style={[styles.navText, activeTab === 'stream' && styles.navActive]}>🔥 Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('liked')} style={styles.navBtn}>
          <Text style={[styles.navText, activeTab === 'liked' && styles.navActive]}>
            ❤️ Liked ({likedIds.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('connect')} style={styles.navBtn}>
          <Text style={[styles.navText, activeTab === 'connect' && styles.navActive]}>🔗 Connect Apps</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07080d' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subText: { color: '#9ca3bd', fontSize: 11 },
  spotifyBtn: {
    backgroundColor: 'rgba(30,215,96,0.16)',
    borderColor: '#1ed760',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  spotifyBtnText: { color: '#1ed760', fontSize: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 14, marginVertical: 10, gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#191c29',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchGoBtn: {
    backgroundColor: '#1ed760',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchGoText: { color: '#041208', fontWeight: '800' },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11131c',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  trackRowActive: { borderColor: '#1ed760', borderWidth: 1 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#191c29' },
  trackMeta: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  trackSub: { color: '#9ca3bd', fontSize: 11, marginTop: 3 },
  iconHit: { paddingHorizontal: 8, paddingVertical: 4 },
  miniPlayer: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 64,
    backgroundColor: '#191c29',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
  },
  miniThumb: { width: 42, height: 42, borderRadius: 8 },
  miniTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  miniArtist: { color: '#9ca3bd', fontSize: 11 },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1ed760',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: { color: '#041208', fontWeight: '900' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#0c0e17',
    flexDirection: 'row',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
  },
  navBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#636b85', fontSize: 12, fontWeight: '700' },
  navActive: { color: '#1ed760' },
  connectBox: { padding: 20 },
  connectTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  connectDesc: { color: '#9ca3bd', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  actionBtn: {
    backgroundColor: '#1ed760',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#041208', fontWeight: '800', fontSize: 13.5 },
});
