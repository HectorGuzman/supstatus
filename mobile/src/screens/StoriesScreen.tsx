import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet, Image, Alert, ActivityIndicator,
  RefreshControl, Dimensions, KeyboardAvoidingView, Platform,
  FlatList, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient as LinearGradient } from '../components/Gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../services/firebase';
import { api } from '../services/api';
import { requestMediaLibraryPermission, requestCameraPermission } from '../services/permissions';
import { Story, Comment } from '../types';
import { colors, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [body, setBody] = useState('');
  const [spot, setSpot] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<'todos' | 'destacadas' | 'siguiendo'>('todos');
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [commentsStory, setCommentsStory] = useState<Story | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    const unsub = (auth as any).onAuthStateChanged((u: any) => {
      setCurrentUser(u);
      if (u) loadFollowing();
    });
    return unsub;
  }, []);

  const loadFollowing = async () => {
    try {
      const d = await api.getFollowing();
      setFollowing(new Set(d.following ?? []));
      setFollowingUsers(new Set(d.following ?? []));
    } catch {}
  };

  const toggleFollow = async (targetUid: string) => {
    const isFollowing = followingUsers.has(targetUid);
    setFollowingUsers(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(targetUid) : next.add(targetUid);
      return next;
    });
    try {
      if (isFollowing) await api.unfollowUser(targetUid);
      else await api.followUser(targetUid);
    } catch {
      setFollowingUsers(prev => {
        const next = new Set(prev);
        isFollowing ? next.add(targetUid) : next.delete(targetUid);
        return next;
      });
    }
  };

  const openUserProfile = async (uid: string) => {
    setProfileLoading(true);
    setViewingProfile({ uid });
    try {
      const d = await api.getUserProfile(uid);
      setViewingProfile({ ...d.profile, stats: d.stats, isFollowing: followingUsers.has(uid) });
    } catch {
      setViewingProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setSearchLoading(true);
    try {
      const d = await api.searchUsers('');
      setSearchResults(d.users ?? []);
    } catch {} finally {
      setSearchLoading(false);
    }
  };

  const runSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { loadSuggestions(); return; }
    setSearchLoading(true);
    try {
      const d = await api.searchUsers(q.trim());
      setSearchResults(d.users ?? []);
    } finally {
      setSearchLoading(false);
    }
  };

  const mapStories = (raw: any[]) => raw.map((s: any) => ({
    ...s,
    likeCount: s.likeCount ?? s.likes ?? 0,
    likedByMe: s.likedByMe ?? s.liked ?? false,
  }));

  const load = async () => {
    try {
      const d = await api.getStories();
      setStories(mapStories(d.stories ?? []));
      setNextCursor(d.nextCursor ?? null);
    } finally { setLoading(false); setRefreshing(false); }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await api.getStories(nextCursor);
      setStories(prev => [...prev, ...mapStories(d.stories ?? [])]);
      setNextCursor(d.nextCursor ?? null);
    } finally { setLoadingMore(false); }
  };

  useEffect(() => { load(); }, []);

  const openComments = async (story: Story) => {
    setCommentsStory(story);
    setLoadingComments(true);
    try {
      const data = await api.getComments(story.id);
      setComments(data.comments ?? []);
    } finally {
      setLoadingComments(false);
    }
  };

  const sendComment = async () => {
    if (!commentsStory || !commentText.trim()) return;
    if (!currentUser) { Alert.alert('Inicia sesión para comentar'); return; }
    setSendingComment(true);
    try {
      const data = await api.addComment(commentsStory.id, commentText.trim());
      setComments(c => [...c, data.comment]);
      setCommentText('');
      setStories(s => s.map(st => st.id === commentsStory.id
        ? { ...st, commentCount: (st.commentCount ?? 0) + 1 }
        : st));
    } catch {
      Alert.alert('Error', 'No se pudo enviar el comentario.');
    } finally {
      setSendingComment(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!commentsStory) return;
    try {
      await api.deleteComment(commentsStory.id, commentId);
      setComments(c => c.filter(x => x.id !== commentId));
      setStories(s => s.map(st => st.id === commentsStory.id
        ? { ...st, commentCount: Math.max((st.commentCount ?? 0) - 1, 0) }
        : st));
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el comentario.');
    }
  };

  const pickImage = () => {
    Alert.alert('Agregar foto', '¿De dónde quieres subir la foto?', [
      {
        text: 'Cámara',
        onPress: async () => {
          if (!(await requestCameraPermission())) return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
          if (!result.canceled) setImageUri(result.assets[0].uri);
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          if (!(await requestMediaLibraryPermission())) return;
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
          if (!result.canceled) setImageUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (body.length < 10) { Alert.alert('El texto debe tener al menos 10 caracteres'); return; }
    setSaving(true);
    try {
      let mediaUrl: string | undefined;
      if (imageUri) {
        const blob = await (await fetch(imageUri)).blob();
        const fileRef = ref(storage, `stories/${Date.now()}.jpg`);
        await uploadBytes(fileRef, blob);
        mediaUrl = await getDownloadURL(fileRef);
      }
      await api.createStory({ body, spot: spot || undefined, mediaUrl });
      setShowCreate(false); setBody(''); setSpot(''); setImageUri(null);
      await load();
    } catch { Alert.alert('Error', 'No se pudo publicar la historia.'); }
    finally { setSaving(false); }
  };

  const toggleLike = async (id: string) => {
    if (!currentUser) { Alert.alert('Inicia sesión para dar like'); return; }
    const prev = stories.find(s => s.id === id);
    setStories(s => s.map(st => st.id === id
      ? { ...st, likedByMe: !st.likedByMe, likeCount: st.likeCount + (st.likedByMe ? -1 : 1) }
      : st));
    try {
      const data = await api.likeStory(id);
      setStories(s => s.map(st => st.id === id
        ? { ...st, likedByMe: data.liked, likeCount: data.likes }
        : st));
    } catch {
      if (prev) setStories(s => s.map(st => st.id === id ? { ...st, likedByMe: prev.likedByMe, likeCount: prev.likeCount } : st));
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071828', '#040e1e']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Historias</Text>
            <Text style={styles.screenSub}>Comunidad SUP</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {currentUser && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => { setShowSearch(true); loadSuggestions(); }}>
                <Ionicons name="person-add-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {currentUser && (
              <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
                <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]} />
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.newBtnText}>Nueva</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {([
              { key: 'todos', label: 'Todos', icon: 'globe-outline' },
              { key: 'destacadas', label: 'Destacadas', icon: 'star' },
              { key: 'siguiendo', label: 'Siguiendo', icon: 'people' },
            ] as const).map(({ key: f, label, icon }) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
              >
                {filter === f && <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]} />}
                <Ionicons name={icon as any} size={13} color={filter === f ? '#fff' : colors.textMuted} />
                <Text style={[styles.filterTabText, filter === f && { color: '#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(() => {
            let visible = stories;
            if (filter === 'destacadas') visible = stories.filter(s => s.featured);
            else if (filter === 'siguiendo') visible = stories.filter(s => followingUsers.has(s.authorUid ?? ''));

            const emptyMessages: Record<string, string> = {
              destacadas: 'Sin historias destacadas',
              siguiendo: 'Aún no sigues a nadie',
              todos: 'Sin historias aún',
            };

            if (visible.length === 0) return (
              <View style={styles.emptyState}>
                <Ionicons name={filter === 'siguiendo' ? 'people-outline' : 'images-outline'} size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{emptyMessages[filter]}</Text>
                <Text style={styles.emptySub}>
                  {filter === 'siguiendo' ? 'Busca usuarios con el botón de arriba' : '¡Sé el primero en compartir!'}
                </Text>
              </View>
            );
            return <>{visible.map(s => (
              <StoryCard
                key={s.id}
                story={s}
                onLike={() => toggleLike(s.id)}
                onComment={() => openComments(s)}
                isFollowing={followingUsers.has(s.authorUid ?? '')}
                onFollowToggle={currentUser && s.authorUid !== currentUser.uid ? () => toggleFollow(s.authorUid ?? '') : undefined}
                onViewProfile={s.authorUid ? () => openUserProfile(s.authorUid!) : undefined}
              />
            ))}</>;
          })()}
          {nextCursor && filter === 'todos' && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={loadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={styles.loadMoreText}>Cargar más historias</Text>}
            </TouchableOpacity>
          )}
          <View style={{ height: 80 + insets.bottom }} />
        </ScrollView>
      )}

      {/* Search & follow users modal */}
      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#071828', '#040e1e']} style={StyleSheet.absoluteFill} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} style={styles.modalBack}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Buscar usuarios</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.searchInputRow}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={runSearch}
              autoFocus
              autoCapitalize="none"
            />
            {searchLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={item => item.uid}
            contentContainerStyle={{ padding: spacing.md, gap: 10, paddingBottom: spacing.md + insets.bottom }}
            ListHeaderComponent={!searchLoading && searchResults.length > 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {searchQuery.length >= 2 ? 'Resultados' : 'Sugerencias'}
              </Text>
            ) : null}
            ListEmptyComponent={!searchLoading ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
                {searchQuery.length >= 2 ? 'Sin resultados' : 'No hay usuarios aún'}
              </Text>
            ) : null}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.userRow} onPress={() => openUserProfile(item.uid)} activeOpacity={0.7}>
                <View style={styles.userAvatar}>
                  {item.avatarUrl
                    ? <Image source={{ uri: item.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    : <Ionicons name="person" size={22} color={colors.textMuted} />
                  }
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.userDisplayName}>{item.displayName}</Text>
                  {item.nivel && <Text style={styles.userNivel}>{item.nivel}</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const isF = followingUsers.has(item.uid);
                    setFollowingUsers(prev => {
                      const next = new Set(prev);
                      isF ? next.delete(item.uid) : next.add(item.uid);
                      return next;
                    });
                    setSearchResults(prev => prev.map(u => u.uid === item.uid ? { ...u, isFollowing: !isF } : u));
                    if (isF) api.unfollowUser(item.uid).catch(() => {});
                    else api.followUser(item.uid).catch(() => {});
                  }}
                  style={[styles.followBtn, followingUsers.has(item.uid) && styles.followBtnActive]}
                >
                  <Text style={[styles.followBtnText, followingUsers.has(item.uid) && { color: colors.textMuted }]}>
                    {followingUsers.has(item.uid) ? 'Siguiendo' : 'Seguir'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Public profile modal */}
      <Modal visible={!!viewingProfile} animationType="slide" transparent onRequestClose={() => setViewingProfile(null)}>
        <View style={styles.profileOverlay}>
          <View style={[styles.profileSheet, { paddingBottom: spacing.lg + insets.bottom }]}>
            <TouchableOpacity style={styles.profileClose} onPress={() => setViewingProfile(null)}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            {profileLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : viewingProfile?.displayName ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar + name */}
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatarWrap}>
                    {viewingProfile.avatarUrl
                      ? <Image source={{ uri: viewingProfile.avatarUrl }} style={styles.profileAvatarImg} />
                      : <Ionicons name="person" size={36} color={colors.textMuted} />}
                  </View>
                  <Text style={styles.profileName}>{viewingProfile.displayName}</Text>
                  {viewingProfile.nivel && <Text style={styles.profileNivel}>{viewingProfile.nivel}</Text>}
                  {/* Follow button */}
                  {currentUser && viewingProfile.uid !== currentUser.uid && (
                    <TouchableOpacity
                      style={[styles.profileFollowBtn, followingUsers.has(viewingProfile.uid) && styles.profileFollowBtnActive]}
                      onPress={() => {
                        toggleFollow(viewingProfile.uid);
                        setViewingProfile((p: any) => ({ ...p, isFollowing: !p.isFollowing }));
                      }}
                    >
                      <Text style={styles.profileFollowBtnText}>
                        {followingUsers.has(viewingProfile.uid) ? 'Siguiendo' : 'Seguir'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Stats */}
                {viewingProfile.stats && (
                  <View style={styles.profileStatsRow}>
                    <View style={styles.profileStat}>
                      <Text style={styles.profileStatVal}>{viewingProfile.stats.totalSessions}</Text>
                      <Text style={styles.profileStatLabel}>Remadas</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={styles.profileStatVal}>{viewingProfile.stats.totalKm}</Text>
                      <Text style={styles.profileStatLabel}>km</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={styles.profileStatVal}>{viewingProfile.stats.totalHours}</Text>
                      <Text style={styles.profileStatLabel}>horas</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={styles.profileStatVal}>{viewingProfile.followersCount ?? 0}</Text>
                      <Text style={styles.profileStatLabel}>seguidores</Text>
                    </View>
                  </View>
                )}

                {/* Info fields */}
                <View style={styles.profileInfo}>
                  {viewingProfile.disciplinas?.length > 0 && (
                    <View style={styles.profileInfoRow}>
                      <Ionicons name="water-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.profileInfoText}>{viewingProfile.disciplinas.join(' · ')}</Text>
                    </View>
                  )}
                  {viewingProfile.boardSetup && (
                    <View style={styles.profileInfoRow}>
                      <Ionicons name="boat-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.profileInfoText}>{viewingProfile.boardSetup}</Text>
                    </View>
                  )}
                  {viewingProfile.bio && (
                    <View style={styles.profileInfoRow}>
                      <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.profileInfoText}>{viewingProfile.bio}</Text>
                    </View>
                  )}
                  {viewingProfile.goals && (
                    <View style={styles.profileInfoRow}>
                      <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.profileInfoText}>{viewingProfile.goals}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Create story modal */}
      <Modal visible={showCreate} animationType="slide">
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#071828', '#040e1e']} style={StyleSheet.absoluteFill} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.modalBack}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva Historia</Text>
            <TouchableOpacity style={[styles.publishBtn, saving && { opacity: 0.5 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]} />
                  <Text style={styles.publishBtnText}>Publicar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            <TouchableOpacity style={styles.imagePickerArea} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePickerEmpty}>
                  <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.imagePickerText}>Agregar foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.bodyInput}
                placeholder="¿Qué viviste en el agua? Comparte tu experiencia..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={body}
                onChangeText={setBody}
              />
            </View>

            <View style={styles.spotInput}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.spotText}
                placeholder="¿Dónde fue? (opcional)"
                placeholderTextColor={colors.textMuted}
                value={spot}
                onChangeText={setSpot}
              />
            </View>

            <Text style={[styles.charCount, { color: body.length < 10 ? colors.danger : colors.textMuted }]}>
              {body.length} / mín. 10 caracteres
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Comments bottom sheet */}
      <Modal
        visible={!!commentsStory}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsStory(null)}
      >
        <View style={styles.commentsOverlay}>
          <TouchableOpacity style={styles.commentsDismiss} activeOpacity={1} onPress={() => setCommentsStory(null)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.commentsSheet}
          >
            <LinearGradient colors={['#0d1f33', '#040e1e']} style={StyleSheet.absoluteFill} />
            <View style={styles.sheetHandle} />
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setCommentsStory(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={c => c.id}
                style={styles.commentsList}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 + insets.bottom }}
                ListEmptyComponent={
                  <View style={styles.noComments}>
                    <Ionicons name="chatbubble-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.noCommentsText}>Sin comentarios aún</Text>
                    <Text style={styles.noCommentsSub}>¡Sé el primero en comentar!</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <CommentRow
                    comment={item}
                    isOwn={(auth as any).currentUser?.uid === item.authorUid}
                    onDelete={() => {
                      Alert.alert('Eliminar comentario', '¿Estás seguro?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => removeComment(item.id) },
                      ]);
                    }}
                  />
                )}
              />
            )}

            {currentUser ? (
              <View style={[styles.commentInputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                <View style={styles.commentInputAvatar}>
                  {currentUser?.photoURL ? (
                    <Image source={{ uri: currentUser.photoURL }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                  ) : (
                    <LinearGradient colors={['#0ea5e9', '#0284c7']} style={styles.commentInputAvatarGrad}>
                      <Text style={styles.commentInputAvatarInitial}>
                        {(currentUser?.displayName?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Agrega un comentario..."
                  placeholderTextColor={colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!commentText.trim() || sendingComment) && { opacity: 0.35 }]}
                  onPress={sendComment}
                  disabled={!commentText.trim() || sendingComment}
                >
                  {sendingComment
                    ? <ActivityIndicator color={colors.primary} size="small" />
                    : <Ionicons name="send" size={20} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.loginPrompt, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                <Text style={styles.loginPromptText}>Inicia sesión para comentar</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function Avatar({ uri, name, size = 40 }: { uri?: string; name?: string; size?: number }) {
  const br = size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: br }} />;
  }
  return (
    <LinearGradient colors={['#0ea5e9', '#0284c7']} style={{ width: size, height: size, borderRadius: br, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </LinearGradient>
  );
}

function StoryCard({ story, onLike, onComment, isFollowing, onFollowToggle, onViewProfile }: {
  story: Story; onLike: () => void; onComment: () => void;
  isFollowing?: boolean; onFollowToggle?: () => void; onViewProfile?: () => void;
}) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={onViewProfile} disabled={!onViewProfile} activeOpacity={0.7}>
          <View style={styles.avatarRing}>
            <Avatar uri={story.authorAvatar} name={story.authorName} size={36} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardAuthorName}>{story.authorName}</Text>
            {story.spot && (
              <View style={styles.spotRow}>
                <Ionicons name="location-outline" size={11} color={colors.primary} />
                <Text style={styles.spotLabel}>{story.spot}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {onFollowToggle && (
          <TouchableOpacity onPress={onFollowToggle} style={[styles.followBtn, isFollowing && styles.followBtnActive]}>
            <Text style={[styles.followBtnText, isFollowing && { color: colors.textMuted }]}>
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
        )}
        {story.featured && !onFollowToggle && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={11} color={colors.warning} />
            <Text style={styles.featuredText}>Destacada</Text>
          </View>
        )}
        <Text style={styles.dateText}>{formatRelativeTime(story.createdAt)}</Text>
      </View>

      {/* Image */}
      {story.mediaUrl && (
        <Image source={{ uri: story.mediaUrl }} style={styles.cardImage} resizeMode="cover" />
      )}

      {/* Actions */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike} activeOpacity={0.7}>
          <Ionicons
            name={story.likedByMe ? 'heart' : 'heart-outline'}
            size={26}
            color={story.likedByMe ? '#ef4444' : colors.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onComment} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Counts */}
      <View style={styles.countsRow}>
        {story.likeCount > 0 && (
          <Text style={styles.likesText}>{story.likeCount} {story.likeCount === 1 ? 'me gusta' : 'me gusta'}</Text>
        )}
      </View>

      {/* Caption */}
      <View style={styles.captionRow}>
        <Text style={styles.captionText}>
          <Text style={styles.captionAuthor}>{story.authorName} </Text>
          {story.body}
        </Text>
      </View>

      {/* Comments link */}
      {(story.commentCount ?? 0) > 0 && (
        <TouchableOpacity onPress={onComment} style={styles.viewComments}>
          <Text style={styles.viewCommentsText}>Ver los {story.commentCount} comentarios</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onComment} style={styles.addCommentPrompt}>
        <Text style={styles.addCommentText}>Agrega un comentario...</Text>
      </TouchableOpacity>
    </View>
  );
}

function CommentRow({ comment, isOwn, onDelete }: { comment: Comment; isOwn: boolean; onDelete: () => void }) {
  return (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatarWrap}>
        <Avatar uri={comment.authorAvatar} name={comment.authorName} size={32} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.commentText}>
          <Text style={styles.commentAuthor}>{comment.authorName ?? 'Usuario'} </Text>
          {comment.text}
        </Text>
        <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
      </View>
      {isOwn && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteCommentBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  screenSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full, overflow: 'hidden' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyState: { alignItems: 'center', padding: 60, gap: 10 },
  emptyTitle: { color: colors.textSecondary, fontSize: 18, fontWeight: '600' },
  emptySub: { color: colors.textMuted, fontSize: 14 },

  loadMoreBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginHorizontal: spacing.md, marginTop: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, minHeight: 48 },
  loadMoreText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  // Follow
  followBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary, backgroundColor: 'transparent' },
  followBtnActive: { borderColor: colors.border, backgroundColor: colors.surface2 },
  followBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  iconBtn: { padding: 8, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },

  // Search modal
  searchInputRow: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface1, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  userDisplayName: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  userNivel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  // Public profile modal
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  profileSheet: { backgroundColor: colors.surface1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '85%', paddingBottom: spacing.lg },
  profileClose: { alignSelf: 'flex-end', padding: 4, marginBottom: 8 },
  profileHeader: { alignItems: 'center', marginBottom: spacing.lg },
  profileAvatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  profileAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  profileNivel: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  profileFollowBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  profileFollowBtnActive: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  profileFollowBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  profileStatsRow: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, gap: 0 },
  profileStat: { flex: 1, alignItems: 'center' },
  profileStatVal: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  profileStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  profileInfo: { gap: 12 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  profileInfoText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  filterTabActive: {},
  filterTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  // Instagram-style post card
  card: { backgroundColor: colors.surface1, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 0 },
  avatarRing: { width: 42, height: 42, borderRadius: 21, padding: 2, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cardAuthorName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  spotRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  spotLabel: { color: colors.primary, fontSize: 11, fontWeight: '500' },
  dateText: { color: colors.textMuted, fontSize: 11, marginLeft: 8 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(234,179,8,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginRight: 6 },
  featuredText: { color: colors.warning, fontSize: 10, fontWeight: '600' },
  cardImage: { width, height: width },
  actionBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 },
  actionBtn: { padding: 6 },
  countsRow: { paddingHorizontal: 14, paddingBottom: 4 },
  likesText: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  captionRow: { paddingHorizontal: 14, paddingBottom: 4 },
  captionAuthor: { fontWeight: '700', color: colors.textPrimary, fontSize: 14 },
  captionText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  viewComments: { paddingHorizontal: 14, paddingBottom: 4 },
  viewCommentsText: { color: colors.textMuted, fontSize: 14 },
  addCommentPrompt: { paddingHorizontal: 14, paddingBottom: 14 },
  addCommentText: { color: colors.textMuted, fontSize: 14 },

  // Comments sheet
  commentsOverlay: { flex: 1, justifyContent: 'flex-end' },
  commentsDismiss: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  commentsSheet: { height: '72%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  sheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  commentsList: { flex: 1 },
  noComments: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  noCommentsText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  noCommentsSub: { color: colors.textMuted, fontSize: 13 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  commentAvatarWrap: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  commentAuthor: { fontWeight: '700', color: colors.textPrimary, fontSize: 13 },
  commentText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  commentTime: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  deleteCommentBtn: { padding: 2 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  commentInputAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  commentInputAvatarGrad: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  commentInputAvatarInitial: { color: '#fff', fontWeight: '700', fontSize: 13 },
  commentInput: { flex: 1, color: colors.textPrimary, fontSize: 14, maxHeight: 80 },
  sendBtn: { padding: 4 },
  loginPrompt: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  loginPromptText: { color: colors.textMuted, fontSize: 14 },

  // Create modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalBack: { padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  publishBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: radius.full, overflow: 'hidden', minWidth: 80, alignItems: 'center' },
  publishBtnText: { color: '#fff', fontWeight: '700' },
  modalBody: { flex: 1, padding: spacing.md },
  imagePickerArea: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  imagePickerEmpty: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.surface2 },
  imagePickerText: { color: colors.textMuted, fontSize: 14 },
  pickedImage: { width: '100%', height: 220 },
  inputCard: { backgroundColor: colors.surface2, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  bodyInput: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, minHeight: 100, textAlignVertical: 'top' },
  spotInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  spotText: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  charCount: { fontSize: 12, textAlign: 'right' },
});
