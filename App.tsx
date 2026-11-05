import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Brain,
  Camera,
  Check,
  ChevronRight,
  Copy,
  File,
  Globe2,
  Image as ImageIcon,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Pencil,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SoobshchenieChata = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  reaction?: 'like' | 'dislike';
};

type ZapisChata = {
  id: string;
  title: string;
  updatedAt: number;
  messages: SoobshchenieChata[];
};

type NazvaniePaneli = 'history' | 'settings' | 'attachments' | 'voice' | 'rename' | null;

type PalitraTsvetov = {
  background: string;
  surface: string;
  alternate: string;
  primary: string;
  strong: string;
  soft: string;
  border: string;
  tekst: string;
  secondary: string;
  muted: string;
  userBubble: string;
  danger: string;
};

const svetlayaPalitra: PalitraTsvetov = {
  background: '#F4FFF4', surface: '#FFFFFF', alternate: '#ECFBEC', primary: '#7ED957',
  strong: '#3FAE3F', soft: '#DDF7D6', border: '#D7EFD7', tekst: '#172117',
  secondary: '#617261', muted: '#8AA08A', userBubble: '#DDF7D6', danger: '#E55353',
};
const temnayaPalitra: PalitraTsvetov = {
  background: '#0F1A0F', surface: '#162316', alternate: '#1D2D1D', primary: '#8BE878',
  strong: '#6FCF5A', soft: '#243D24', border: '#2A3F2A', tekst: '#EAF7EA',
  secondary: '#A9C0A9', muted: '#7E967E', userBubble: '#243D24', danger: '#F07878',
};
const KLYUCH_ISTORII = 'assistentka_local_chats_v1';
const MODEL_PO_UMOLCHANIYU = 'openai/gpt-4o-mini';

function sozdatId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sokratitNazvanie(tekst: string): string {
  const ochishchennyyTekst = tekst.trim().replace(/\s+/g, ' ');
  return ochishchennyyTekst.length > 34 ? `${ochishchennyyTekst.slice(0, 34)}…` : ochishchennyyTekst || 'Новый чат';
}

function Logotip({ size = 28, color = '#3FAE3F' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.35, backgroundColor: '#E7FBE2', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.63, lineHeight: size * 0.76 }}>A</Text>
      <Sparkles size={size * 0.28} color={color} style={{ position: 'absolute', right: -2, top: -2 }} />
    </View>
  );
}

function KruglayaKnopka({
  onPress,
  children,
  label,
  color = '#617261',
  background,
  disabled = false,
  size = 48,
}: {
  onPress: () => void;
  children: React.ReactNode;
  label: string;
  color?: string;
  background?: string;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: background || 'transparent', opacity: disabled ? 0.42 : pressed ? 0.72 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {children}
    </Pressable>
  );
}

export default function App() {
  const [temnayaTema, ustanovitTemnuyuTemu] = useState(false);
  const tsveta = temnayaTema ? temnayaPalitra : svetlayaPalitra;
  const [spisokChatov, ustanovitSpisokChatov] = useState<ZapisChata[]>([]);
  const [istoriyaZagruzhena, ustanovitStatusZagruzkiIstorii] = useState(false);
  const [idAktivnogoChata, ustanovitIdAktivnogoChata] = useState<string | null>(null);
  const [otkrytayaPanel, ustanovitOtkrytuyuPanel] = useState<NazvaniePaneli>(null);
  const [tekstPoiska, ustanovitTekstPoiska] = useState('');
  const [tekstSoobshcheniya, ustanovitTekstSoobshcheniya] = useState('');
  const [rezhimRazmyshleniya, ustanovitRezhimRazmyshleniya] = useState(false);
  const [rezhimPoiska, ustanovitRezhimPoiska] = useState(false);
  const [generatsiyaIdet, ustanovitStatusGeneratsii] = useState(false);
  const [tekstUvedomleniya, ustanovitTekstUvedomleniya] = useState('');
  const [prikreplennyeFayly, ustanovitPrikreplennyeFayly] = useState<string[]>([]);
  const [idChataVMenyu, ustanovitIdChataVMenyu] = useState<string | null>(null);
  const [idChataDlyaPereimenovaniya, ustanovitIdChataDlyaPereimenovaniya] = useState<string | null>(null);
  const [nazvanieChataDlyaRedaktirovaniya, ustanovitNazvanieChataDlyaRedaktirovaniya] = useState('');
  const [zapisAktivna, ustanovitAktivnostZapisi] = useState(false);
  const [pokazyvatKnopkuVNiz, ustanovitPokazKnopkiVNiz] = useState(false);
  const ssylkaNaSpisok = useRef<ScrollView>(null);
  const kontrollerZaprosa = useRef<AbortController | null>(null);
  const ssylkaNaPoleSoobshcheniya = useRef<TextInput>(null);

  const aktivnyChat = spisokChatov.find((zapisChata) => zapisChata.id === idAktivnogoChata) || null;
  const otobrazhaemyeChaty = useMemo(() => {
    const zapros = tekstPoiska.trim().toLocaleLowerCase('ru');
    return spisokChatov.filter((zapisChata) => !zapros || zapisChata.title.toLocaleLowerCase('ru').includes(zapros));
  }, [spisokChatov, tekstPoiska]);

  useEffect(() => {
    AsyncStorage.getItem(KLYUCH_ISTORII)
      .then((sokhrannyeChaty) => {
        if (sokhrannyeChaty) ustanovitSpisokChatov(JSON.parse(sokhrannyeChaty) as ZapisChata[]);
      })
      .catch(() => pokazatUvedomlenie('Не удалось загрузить историю чатов'))
      .finally(() => ustanovitStatusZagruzkiIstorii(true));
  }, []);

  useEffect(() => {
    if (!istoriyaZagruzhena) return;
    AsyncStorage.setItem(KLYUCH_ISTORII, JSON.stringify(spisokChatov)).catch(() => undefined);
  }, [spisokChatov, istoriyaZagruzhena]);

  useEffect(() => {
    if (!tekstUvedomleniya) return;
    const taymerUvedomleniya = setTimeout(() => ustanovitTekstUvedomleniya(''), 3000);
    return () => clearTimeout(taymerUvedomleniya);
  }, [tekstUvedomleniya]);

  function pokazatUvedomlenie(tekst: string) {
    ustanovitTekstUvedomleniya(tekst);
  }

  function sozdatNoviyChat() {
    ustanovitIdAktivnogoChata(null);
    ustanovitOtkrytuyuPanel(null);
    ustanovitTekstSoobshcheniya('');
    ustanovitPrikreplennyeFayly([]);
    Keyboard.dismiss();
  }

  async function dobavitVlozhenie(nazvanieFayla: string) {
    ustanovitPrikreplennyeFayly((tekushchieImenaFaylov) => [...tekushchieImenaFaylov, nazvanieFayla]);
    ustanovitOtkrytuyuPanel(null);
    ssylkaNaPoleSoobshcheniya.current?.focus();
  }

  async function vybratIzobrazhenie() {
    const rezultat = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!rezultat.canceled && rezultat.assets[0]) await dobavitVlozhenie(rezultat.assets[0].fileName || 'Изображение');
  }

  async function otkrytKameru() {
    const razreshenie = await ImagePicker.requestCameraPermissionsAsync();
    if (!razreshenie.granted) {
      pokazatUvedomlenie('Разрешите доступ к камере в настройках');
      return;
    }
    const rezultat = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!rezultat.canceled) await dobavitVlozhenie(rezultat.assets[0]?.fileName || 'Фото с камеры');
  }

  async function vybratFayl() {
    const rezultat = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (!rezultat.canceled && rezultat.assets[0]) {
      if (rezultat.assets[0].size && rezultat.assets[0].size > 20 * 1024 * 1024) {
        pokazatUvedomlenie('Файл слишком большой');
        return;
      }
      await dobavitVlozhenie(rezultat.assets[0].name);
    }
  }

  async function otpravitSoobshchenie(tekstDlyaPovtora?: string) {
    const tekstKOtpravke = (tekstDlyaPovtora ?? tekstSoobshcheniya).trim();
    if ((!tekstKOtpravke && prikreplennyeFayly.length === 0) || generatsiyaIdet) return;
    const tekstDlyaOtpravki = [tekstKOtpravke, ...prikreplennyeFayly.map((name) => `📎 ${name}`)].filter(Boolean).join('\n');
    const idChata = idAktivnogoChata || sozdatId();
    const tekushcheeVremya = Date.now();
    const soobshcheniePolzovatelya: SoobshchenieChata = { id: sozdatId(), role: 'user', content: tekstDlyaOtpravki, createdAt: tekushcheeVremya };
    const soobshchenieOzhidayushchee: SoobshchenieChata = { id: sozdatId(), role: 'assistant', content: '', createdAt: tekushcheeVremya + 1 };
    ustanovitSpisokChatov((tekushchiySpisokChatov) => {
      const suschetstvuyushchiyChat = tekushchiySpisokChatov.find((zapisChata) => zapisChata.id === idChata);
      if (suschetstvuyushchiyChat) {
        return tekushchiySpisokChatov.map((zapisChata) => zapisChata.id === idChata
          ? { ...zapisChata, title: zapisChata.messages.length ? zapisChata.title : sokratitNazvanie(tekstKOtpravke || prikreplennyeFayly[0] || 'Вложение'), updatedAt: tekushcheeVremya, messages: [...zapisChata.messages, soobshcheniePolzovatelya, soobshchenieOzhidayushchee] }
          : zapisChata);
      }
      return [{ id: idChata, title: sokratitNazvanie(tekstKOtpravke || prikreplennyeFayly[0] || 'Вложение'), updatedAt: tekushcheeVremya, messages: [soobshcheniePolzovatelya, soobshchenieOzhidayushchee] }, ...tekushchiySpisokChatov];
    });
    ustanovitIdAktivnogoChata(idChata);
    ustanovitTekstSoobshcheniya('');
    ustanovitPrikreplennyeFayly([]);
    ustanovitStatusGeneratsii(true);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setTimeout(() => ssylkaNaSpisok.current?.scrollToEnd({ animated: true }), 80);

    const kluchOpenRouter = Constants.expoConfig?.extra?.openRouterApiKey as string | undefined;
    if (!kluchOpenRouter) {
      obnovitOtvetAssistenta(idChata, soobshchenieOzhidayushchee.id, 'Добавь ключ в локальный файл `.env` (OPENROUTER_API_KEY), затем перезапусти Expo.');
      pokazatUvedomlenie('Не найден ключ OpenRouter');
      ustanovitStatusGeneratsii(false);
      return;
    }

    const kontrollerOtmenyZaprosa = new AbortController();
    kontrollerZaprosa.current = kontrollerOtmenyZaprosa;
    try {
      const istoriyaDialoga = (spisokChatov.find((zapisChata) => zapisChata.id === idChata)?.messages || [])
        .filter((soobshchenie) => soobshchenie.content)
        .map((soobshchenie) => ({ role: soobshchenie.role, content: soobshchenie.content }));
      const otvetServera = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kluchOpenRouter}`,
          'Content-Type': 'application/json',
          'X-Title': 'AssistentKa.ai',
        },
        body: JSON.stringify({
          model: MODEL_PO_UMOLCHANIYU,
          messages: [...istoriyaDialoga, { role: 'user', content: tekstDlyaOtpravki }],
          reasoning: rezhimRazmyshleniya ? { enabled: true } : undefined,
          plugins: rezhimPoiska ? [{ id: 'web' }] : undefined,
        }),
        signal: kontrollerOtmenyZaprosa.signal,
      });
      const dannyeOtvetа = await otvetServera.json();
      if (!otvetServera.ok) throw new Error(dannyeOtvetа?.error?.message || `Ошибка API: ${otvetServera.status}`);
      const tekstAssistenta = dannyeOtvetа?.choices?.[0]?.message?.content;
      if (!tekstAssistenta) throw new Error('Сервис не вернул текст ответа');
      obnovitOtvetAssistenta(idChata, soobshchenieOzhidayushchee.id, String(tekstAssistenta));
    } catch (oshibka) {
      if ((oshibka as Error).name === 'AbortError') {
        obnovitOtvetAssistenta(idChata, soobshchenieOzhidayushchee.id, 'Ответ остановлен.');
      } else {
        obnovitOtvetAssistenta(idChata, soobshchenieOzhidayushchee.id, 'Не удалось получить ответ. Проверь ключ, модель и подключение, затем попробуй ещё раз.');
        pokazatUvedomlenie('Не удалось отправить. Проверь подключение и повтори.');
      }
    } finally {
      kontrollerZaprosa.current = null;
      ustanovitStatusGeneratsii(false);
    }
  }

  function obnovitOtvetAssistenta(idChata: string, idSoobshcheniya: string, content: string) {
    ustanovitSpisokChatov((tekushchiySpisokChatov) => tekushchiySpisokChatov.map((zapisChata) => zapisChata.id === idChata
      ? { ...zapisChata, updatedAt: Date.now(), messages: zapisChata.messages.map((soobshchenie) => soobshchenie.id === idSoobshcheniya ? { ...soobshchenie, content } : soobshchenie) }
      : zapisChata));
  }

  function ostanovitGeneratsiyu() {
    kontrollerZaprosa.current?.abort();
  }

  async function kopirovatTekst(tekst: string) {
    await Clipboard.setStringAsync(tekst);
    pokazatUvedomlenie('Скопировано');
  }

  function obnovitReaktsiyu(idSoobshcheniya: string, reaction: 'like' | 'dislike') {
    if (!aktivnyChat) return;
    ustanovitSpisokChatov((tekushchiySpisokChatov) => tekushchiySpisokChatov.map((zapisChata) => zapisChata.id === aktivnyChat.id
      ? { ...zapisChata, messages: zapisChata.messages.map((soobshchenie) => soobshchenie.id === idSoobshcheniya ? { ...soobshchenie, reaction } : soobshchenie) }
      : zapisChata));
  }

  function pereimenovatChat(idChata: string) {
    const zapisChata = spisokChatov.find((element) => element.id === idChata);
    if (!zapisChata) return;
    ustanovitIdChataVMenyu(null);
    ustanovitIdChataDlyaPereimenovaniya(idChata);
    ustanovitNazvanieChataDlyaRedaktirovaniya(zapisChata.title);
    ustanovitOtkrytuyuPanel('rename');
  }

  function sokhranitNazvanieChata() {
    const novoeNazvanie = nazvanieChataDlyaRedaktirovaniya.trim();
    if (!novoeNazvanie || !idChataDlyaPereimenovaniya) return;
    ustanovitSpisokChatov((elementy) => elementy.map((element) => element.id === idChataDlyaPereimenovaniya ? { ...element, title: novoeNazvanie } : element));
    ustanovitOtkrytuyuPanel(null);
    ustanovitIdChataDlyaPereimenovaniya(null);
  }

  function udalitChat(idChata: string) {
    Alert.alert('Удалить чат?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => {
        ustanovitSpisokChatov((elementy) => elementy.filter((element) => element.id !== idChata));
        if (idAktivnogoChata === idChata) ustanovitIdAktivnogoChata(null);
      } },
    ]);
  }

  const ui = sozdatStili(tsveta);
  const zagolovokEkrana = aktivnyChat?.title || 'Новый чат';

  function otobrazitSoobshchenie(soobshchenie: SoobshchenieChata, indeks: number) {
    const etoSoobshcheniePolzovatelya = soobshchenie.role === 'user';
    return (
      <View key={soobshchenie.id} style={[ui.messageGroup, etoSoobshcheniePolzovatelya ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
        {!etoSoobshcheniePolzovatelya ? (
          <View style={ui.assistantCard}>
            <View style={ui.assistantHeading}><Logotip size={27} color={tsveta.strong} /><Text style={ui.assistantName}>AssistentKa.ai</Text></View>
            {soobshchenie.content ? <Text selectable style={ui.tekstSoobshcheniya}>{soobshchenie.content}</Text> : (
              <View style={ui.typingRow}><View style={ui.typingDot} /><View style={ui.typingDot} /><View style={ui.typingDot} /><Text style={ui.typingLabel}>печатает…</Text></View>
            )}
          </View>
        ) : (
          <View style={ui.userBubble}><Text selectable style={ui.tekstSoobshcheniya}>{soobshchenie.content}</Text></View>
        )}
        {!etoSoobshcheniePolzovatelya && soobshchenie.content ? (
          <View style={ui.messageActions}>
            <KruglayaKnopka label="Копировать ответ" size={38} onPress={() => kopirovatTekst(soobshchenie.content)}><Copy size={19} color={tsveta.muted} /></KruglayaKnopka>
            <KruglayaKnopka label="Повторить ответ" size={38} onPress={() => {
              const spisokSoobshcheniyPolzovatelya = aktivnyChat?.messages.filter((element) => element.role === 'user') || [];
              const posledneeSoobshcheniePolzovatelya = spisokSoobshcheniyPolzovatelya[spisokSoobshcheniyPolzovatelya.length - 1];
              if (posledneeSoobshcheniePolzovatelya) otpravitSoobshchenie(posledneeSoobshcheniePolzovatelya.content);
            }}><ArrowDown size={19} color={tsveta.muted} /></KruglayaKnopka>
            <KruglayaKnopka label="Нравится" size={38} onPress={() => obnovitReaktsiyu(soobshchenie.id, 'like')}><ThumbsUp size={19} color={soobshchenie.reaction === 'like' ? tsveta.strong : tsveta.muted} /></KruglayaKnopka>
            <KruglayaKnopka label="Не нравится" size={38} onPress={() => obnovitReaktsiyu(soobshchenie.id, 'dislike')}><ThumbsDown size={19} color={soobshchenie.reaction === 'dislike' ? tsveta.strong : tsveta.muted} /></KruglayaKnopka>
            <KruglayaKnopka label="Поделиться ответом" size={38} onPress={() => Share.share({ message: soobshchenie.content })}><Share2 size={19} color={tsveta.muted} /></KruglayaKnopka>
          </View>
        ) : null}
      </View>
    );
  }

  function otobrazitPrivetstvie() {
    return (
      <View style={ui.welcomeArea}>
        <View style={ui.heroGlow}><Logotip size={72} color={tsveta.strong} /></View>
        <Text style={ui.heroTitle}>Чем помочь?</Text>
        <Text style={ui.heroSubtitle}>Задайте вопрос или прикрепите файл</Text>
        <View style={ui.quickPrompts}>
          {[
            { label: 'Объясни', icon: <Sparkles size={17} color={tsveta.strong} /> },
            { label: 'Напиши текст', icon: <Pencil size={17} color={tsveta.strong} /> },
            { label: 'Переведи', icon: <Globe2 size={17} color={tsveta.strong} /> },
            { label: 'Реши задачу', icon: <Brain size={17} color={tsveta.strong} /> },
          ].map((predlozhenie) => (
            <Pressable key={predlozhenie.label} onPress={() => { ustanovitTekstSoobshcheniya(`${predlozhenie.label}: `); ssylkaNaPoleSoobshcheniya.current?.focus(); }} style={({ pressed }) => [ui.promptChip, pressed && { backgroundColor: tsveta.soft }]}>
              {predlozhenie.icon}<Text style={ui.promptText}>{predlozhenie.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  function otobrazitIstoriyuChatov() {
    const groups: { title: string; elementy: ZapisChata[] }[] = [
      { title: 'Сегодня', elementy: otobrazhaemyeChaty.filter((zapisChata) => Date.now() - zapisChata.updatedAt < 86400000) },
      { title: 'Ранее', elementy: otobrazhaemyeChaty.filter((zapisChata) => Date.now() - zapisChata.updatedAt >= 86400000) },
    ].filter((gruppa) => gruppa.elementy.length > 0);
    return (
      <Modal transparent visible={otkrytayaPanel === 'history'} animationType="fade" onRequestClose={() => ustanovitOtkrytuyuPanel(null)}>
        <View style={ui.modalBackdrop}>
          <Pressable style={ui.backdropTouch} onPress={() => ustanovitOtkrytuyuPanel(null)} />
          <View style={ui.sidePanel}>
            <View style={ui.panelBrand}><Logotip size={28} color={tsveta.strong} /><Text style={ui.brandText}>AssistentKa<Text style={{ color: tsveta.strong }}>.ai</Text></Text></View>
            <Pressable onPress={sozdatNoviyChat} style={ui.newChatButton}><Plus size={21} color="#FFFFFF" /><Text style={ui.newChatText}>Новый чат</Text></Pressable>
            <View style={ui.searchBox}><Search size={19} color={tsveta.muted} /><TextInput value={tekstPoiska} onChangeText={ustanovitTekstPoiska} placeholder="Поиск по чатам" placeholderTextColor={tsveta.muted} style={ui.searchInput} /></View>
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {groups.length === 0 ? (
                <View style={ui.emptyHistory}><MessageCircle size={28} color={tsveta.muted} /><Text style={ui.emptyTitle}>{tekstPoiska ? 'Ничего не найдено' : 'Пока нет чатов'}</Text><Text style={ui.emptySub}>{tekstPoiska ? 'Попробуйте другой запрос' : 'Начните новый чат'}</Text></View>
              ) : groups.map((gruppa) => (
                <View key={gruppa.title}>
                  <Text style={ui.groupLabel}>{gruppa.title}</Text>
                  {gruppa.elementy.map((zapisChata) => (
                    <View key={zapisChata.id} style={[ui.chatHistoryRow, zapisChata.id === idAktivnogoChata && { backgroundColor: tsveta.soft }]}>
                      <Pressable style={ui.chatHistoryMain} onPress={() => { ustanovitIdAktivnogoChata(zapisChata.id); ustanovitOtkrytuyuPanel(null); }} onLongPress={() => pereimenovatChat(zapisChata.id)}>
                        <MessageCircle size={19} color={tsveta.secondary} /><Text numberOfLines={1} style={ui.chatHistoryTitle}>{zapisChata.title}</Text>
                      </Pressable>
                      <Pressable accessibilityLabel={`Действия: ${zapisChata.title}`} onPress={() => ustanovitIdChataVMenyu(idChataVMenyu === zapisChata.id ? null : zapisChata.id)} style={ui.smallIconButton}><MoreHorizontal size={20} color={tsveta.muted} /></Pressable>
                      {idChataVMenyu === zapisChata.id ? (
                        <View style={ui.chatActionPopup}>
                          <Pressable style={ui.popupRow} onPress={() => pereimenovatChat(zapisChata.id)}><Pencil size={16} color={tsveta.secondary} /><Text style={ui.popupText}>Переименовать</Text></Pressable>
                          <Pressable style={ui.popupRow} onPress={() => { ustanovitIdChataVMenyu(null); udalitChat(zapisChata.id); }}><Trash2 size={16} color={tsveta.danger} /><Text style={[ui.popupText, { color: tsveta.danger }]}>Удалить</Text></Pressable>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
            <View style={ui.panelBottom}>
              <Pressable onPress={() => ustanovitOtkrytuyuPanel('settings')} style={ui.bottomMenuRow}><Settings size={20} color={tsveta.secondary} /><Text style={ui.bottomMenuText}>Настройки</Text><ChevronRight size={18} color={tsveta.muted} /></Pressable>
              <Pressable onPress={() => ustanovitTemnuyuTemu((value) => !value)} style={ui.bottomMenuRow}>{temnayaTema ? <Sparkles size={20} color={tsveta.secondary} /> : <Sparkles size={20} color={tsveta.secondary} />}<Text style={ui.bottomMenuText}>Тема: {temnayaTema ? 'тёмная' : 'светлая'}</Text><ChevronRight size={18} color={tsveta.muted} /></Pressable>
              <Text style={ui.aboutText}>AssistentKa.ai · локальная история</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function otobrazitNastroyki() {
    return (
      <Modal transparent visible={otkrytayaPanel === 'settings'} animationType="slide" onRequestClose={() => ustanovitOtkrytuyuPanel(null)}>
        <View style={ui.modalBackdrop}>
          <Pressable style={ui.backdropTouch} onPress={() => ustanovitOtkrytuyuPanel(null)} />
          <View style={ui.sheetPanel}>
            <View style={ui.sheetHeader}><Text style={ui.sheetTitle}>Настройки</Text><KruglayaKnopka label="Закрыть" size={40} onPress={() => ustanovitOtkrytuyuPanel(null)}><X size={21} color={tsveta.secondary} /></KruglayaKnopka></View>
            <Text style={ui.sectionLabel}>ОФОРМЛЕНИЕ</Text>
            <Pressable style={ui.settingsRow} onPress={() => ustanovitTemnuyuTemu((value) => !value)}><Text style={ui.settingsRowText}>Тема</Text><Text style={ui.settingsValue}>{temnayaTema ? 'Тёмная' : 'Светлая'}</Text><ChevronRight size={18} color={tsveta.muted} /></Pressable>
            <Text style={ui.sectionLabel}>ИНТЕРФЕЙС</Text>
            <View style={ui.settingsRow}><Text style={ui.settingsRowText}>Язык</Text><Text style={ui.settingsValue}>Русский</Text></View>
            <View style={ui.settingsRow}><Text style={ui.settingsRowText}>Размер текста</Text><Text style={ui.settingsValue}>Стандартный</Text></View>
            <Text style={ui.sectionLabel}>ДАННЫЕ</Text>
            <Pressable style={ui.settingsRow} onPress={() => Alert.alert('Очистить историю?', 'Удалить все чаты с этого устройства?', [{ text: 'Отмена', style: 'cancel' }, { text: 'Очистить', style: 'destructive', onPress: () => { ustanovitSpisokChatov([]); ustanovitIdAktivnogoChata(null); ustanovitOtkrytuyuPanel(null); } }])}><Text style={[ui.settingsRowText, { color: tsveta.danger }]}>Очистить историю чатов</Text><Trash2 size={18} color={tsveta.danger} /></Pressable>
            <Text style={ui.sectionLabel}>О ПРИЛОЖЕНИИ</Text>
            <View style={ui.aboutCard}><View style={ui.panelBrand}><Logotip size={28} color={tsveta.strong} /><Text style={ui.brandText}>AssistentKa<Text style={{ color: tsveta.strong }}>.ai</Text></Text></View><Text style={ui.aboutDescription}>Личный ИИ-помощник. История хранится на устройстве.</Text><Text style={ui.aboutText}>Версия 1.0.0</Text></View>
          </View>
        </View>
      </Modal>
    );
  }

  function otobrazitVlozheniya() {
    return (
      <Modal transparent visible={otkrytayaPanel === 'attachments'} animationType="slide" onRequestClose={() => ustanovitOtkrytuyuPanel(null)}>
        <View style={ui.modalBackdrop}>
          <Pressable style={ui.backdropTouch} onPress={() => ustanovitOtkrytuyuPanel(null)} />
          <View style={ui.sheetPanel}>
            <View style={ui.grabber} /><View style={ui.sheetHeader}><Text style={ui.sheetTitle}>Прикрепить</Text><KruglayaKnopka label="Закрыть" size={40} onPress={() => ustanovitOtkrytuyuPanel(null)}><X size={21} color={tsveta.secondary} /></KruglayaKnopka></View>
            <View style={ui.attachmentTiles}>
              <Pressable style={ui.attachmentTile} onPress={vybratIzobrazhenie}><ImageIcon size={27} color={tsveta.strong} /><Text style={ui.attachmentLabel}>Фото</Text></Pressable>
              <Pressable style={ui.attachmentTile} onPress={otkrytKameru}><Camera size={27} color={tsveta.strong} /><Text style={ui.attachmentLabel}>Камера</Text></Pressable>
              <Pressable style={ui.attachmentTile} onPress={vybratFayl}><File size={27} color={tsveta.strong} /><Text style={ui.attachmentLabel}>Файл</Text></Pressable>
            </View>
            <Text style={ui.sectionLabel}>НЕДАВНИЕ</Text>
            <View style={ui.recentEmpty}><File size={23} color={tsveta.muted} /><Text style={ui.recentEmptyText}>Недавно выбранные файлы появятся здесь</Text></View>
          </View>
        </View>
      </Modal>
    );
  }

  function otobrazitDialogPereimenovaniya() {
    return (
      <Modal transparent visible={otkrytayaPanel === 'rename'} animationType="fade" onRequestClose={() => ustanovitOtkrytuyuPanel(null)}>
        <View style={ui.renameBackdrop}>
          <View style={ui.renameCard}>
            <Text style={ui.sheetTitle}>Переименовать чат</Text>
            <TextInput
              value={nazvanieChataDlyaRedaktirovaniya}
              onChangeText={ustanovitNazvanieChataDlyaRedaktirovaniya}
              autoFocus
              maxLength={60}
              placeholder="Название чата"
              placeholderTextColor={tsveta.muted}
              style={ui.renameInput}
              returnKeyType="done"
              onSubmitEditing={sokhranitNazvanieChata}
            />
            <View style={ui.renameActions}>
              <Pressable style={ui.renameCancel} onPress={() => ustanovitOtkrytuyuPanel(null)}><Text style={ui.renameCancelText}>Отмена</Text></Pressable>
              <Pressable style={ui.renameSave} onPress={sokhranitNazvanieChata}><Text style={ui.renameSaveText}>Сохранить</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function otobrazitGolosoVvod() {
    return (
      <Modal transparent visible={otkrytayaPanel === 'voice'} animationType="fade" onRequestClose={() => ustanovitOtkrytuyuPanel(null)}>
        <View style={ui.voiceBackdrop}>
          <View style={ui.voiceCard}>
            <KruglayaKnopka label="Закрыть голосовой ввод" size={44} onPress={() => { ustanovitOtkrytuyuPanel(null); ustanovitAktivnostZapisi(false); }}><X size={22} color={tsveta.secondary} /></KruglayaKnopka>
            <View style={ui.voiceOrb}><Mic size={43} color={tsveta.strong} /></View>
            <Text style={ui.voiceTitle}>{zapisAktivna ? 'Слушаю вас…' : 'Голосовой ввод'}</Text>
            <Text style={ui.voiceTimer}>{zapisAktivna ? '00:01' : '00:00'}</Text>
            <View style={ui.waveform}>{Array.from({ length: 14 }).map((_, indeks) => <View key={indeks} style={[ui.waveBar, { height: [15, 22, 32, 20, 41, 25, 36, 18, 30, 42, 20, 34, 24, 16][indeks] }]} />)}</View>
            <Text style={ui.voiceHint}>Для распознавания речи потребуется подключить модуль speech-to-text.</Text>
            <View style={ui.voiceActions}>
              <Pressable style={[ui.voiceButton, { backgroundColor: tsveta.alternate }]} onPress={() => { ustanovitOtkrytuyuPanel(null); ustanovitAktivnostZapisi(false); }}><X size={22} color={tsveta.secondary} /><Text style={ui.voiceButtonText}>Отмена</Text></Pressable>
              <Pressable style={[ui.voiceButton, { backgroundColor: tsveta.soft }]} onPress={() => { ustanovitAktivnostZapisi(true); pokazatUvedomlenie('Распознавание речи пока не подключено'); }}><Check size={22} color={tsveta.strong} /><Text style={ui.voiceButtonText}>Готово</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={[ui.safeArea, { backgroundColor: tsveta.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={temnayaTema ? 'light-content' : 'dark-content'} backgroundColor={tsveta.background} />
      <KeyboardAvoidingView style={ui.app} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={ui.topBar}>
          <KruglayaKnopka label="Открыть историю чатов" onPress={() => { ustanovitTekstPoiska(''); ustanovitOtkrytuyuPanel('history'); }}><Menu size={24} color={tsveta.tekst} /></KruglayaKnopka>
          {aktivnyChat ? (
            <View style={ui.chatTitleWrap}><Text numberOfLines={1} style={ui.topTitle}>{zagolovokEkrana}</Text></View>
          ) : (
            <View style={ui.topBrand}><Logotip size={25} color={tsveta.strong} /><Text style={ui.topBrandText}>AssistentKa<Text style={{ color: tsveta.strong }}>.ai</Text></Text></View>
          )}
          {aktivnyChat ? <KruglayaKnopka label="Действия чата" onPress={() => Alert.alert(zagolovokEkrana, undefined, [{ text: 'Переименовать', onPress: () => pereimenovatChat(aktivnyChat.id) }, { text: 'Поделиться', onPress: () => Share.share({ message: aktivnyChat.messages.map((soobshchenie) => `${soobshchenie.role === 'user' ? 'Вы' : 'AssistentKa.ai'}: ${soobshchenie.content}`).join('\n\n') }) }, { text: 'Удалить', style: 'destructive', onPress: () => udalitChat(aktivnyChat.id) }, { text: 'Отмена', style: 'cancel' }])}><MoreHorizontal size={23} color={tsveta.tekst} /></KruglayaKnopka> : null}
          <KruglayaKnopka label="Новый чат" onPress={sozdatNoviyChat}><View style={{ width: 25, height: 25, borderRadius: 7, borderWidth: 1.8, borderColor: tsveta.tekst, alignItems: 'center', justifyContent: 'center' }}><Plus size={18} color={tsveta.tekst} /></View></KruglayaKnopka>
        </View>

        <ScrollView
          ref={ssylkaNaSpisok}
          style={ui.conversationScroll}
          contentContainerStyle={[ui.conversationContent, !aktivnyChat && { flexGrow: 1, justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => ustanovitPokazKnopkiVNiz(event.nativeEvent.contentOffset.y > 100)}
          scrollEventThrottle={100}
        >
          {!aktivnyChat || aktivnyChat.messages.length === 0 ? otobrazitPrivetstvie() : aktivnyChat.messages.map(otobrazitSoobshchenie)}
        </ScrollView>

        {pokazyvatKnopkuVNiz && aktivnyChat ? <Pressable style={ui.scrollDownButton} onPress={() => ssylkaNaSpisok.current?.scrollToEnd({ animated: true })}><ArrowDown size={20} color={tsveta.strong} /></Pressable> : null}

        {tekstUvedomleniya ? <View style={ui.toast}><Text style={ui.tekstUvedomleniya}>{tekstUvedomleniya}</Text></View> : null}

        <View style={ui.composerOuter}>
          {prikreplennyeFayly.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.attachmentChips}>{prikreplennyeFayly.map((name, indeks) => <View key={`${name}_${indeks}`} style={ui.fileChip}><File size={15} color={tsveta.strong} /><Text numberOfLines={1} style={ui.fileChipText}>{name}</Text><Pressable accessibilityLabel="Удалить вложение" onPress={() => ustanovitPrikreplennyeFayly((elementy) => elementy.filter((_, indeksElementa) => indeksElementa !== indeks))}><X size={16} color={tsveta.secondary} /></Pressable></View>)}</ScrollView> : null}
          <View style={ui.modeRow}>
            <Pressable onPress={() => ustanovitRezhimRazmyshleniya((value) => !value)} style={[ui.modePill, rezhimRazmyshleniya && ui.modePillActive]}><Brain size={16} color={rezhimRazmyshleniya ? tsveta.tekst : tsveta.secondary} /><Text style={[ui.modeText, rezhimRazmyshleniya && { color: tsveta.tekst }]}>Размышление</Text></Pressable>
            <Pressable onPress={() => ustanovitRezhimPoiska((value) => !value)} style={[ui.modePill, rezhimPoiska && ui.modePillActive]}><Globe2 size={16} color={rezhimPoiska ? tsveta.tekst : tsveta.secondary} /><Text style={[ui.modeText, rezhimPoiska && { color: tsveta.tekst }]}>Поиск</Text></Pressable>
          </View>
          <View style={ui.inputBox}>
            <TextInput
              ref={ssylkaNaPoleSoobshcheniya}
              value={tekstSoobshcheniya}
              onChangeText={ustanovitTekstSoobshcheniya}
              placeholder="Спросите AssistentKa.ai"
              placeholderTextColor={tsveta.muted}
              multiline
              maxLength={12000}
              textAlignVertical="top"
              style={ui.messageInput}
              accessibilityLabel="Сообщение для AssistentKa.ai"
            />
            <View style={ui.inputTools}>
              <KruglayaKnopka label="Прикрепить файл" size={44} onPress={() => { Keyboard.dismiss(); ustanovitOtkrytuyuPanel('attachments'); }}><Paperclip size={22} color={tsveta.secondary} /></KruglayaKnopka>
              <View style={{ flex: 1 }} />
              <KruglayaKnopka label="Голосовой ввод" size={44} onPress={() => ustanovitOtkrytuyuPanel('voice')}><Mic size={22} color={tsveta.secondary} /></KruglayaKnopka>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={generatsiyaIdet ? 'Остановить генерацию' : 'Отправить сообщение'}
                disabled={!generatsiyaIdet && !tekstSoobshcheniya.trim() && prikreplennyeFayly.length === 0}
                onPress={generatsiyaIdet ? ostanovitGeneratsiyu : () => otpravitSoobshchenie()}
                style={({ pressed }) => [ui.sendButton, (!generatsiyaIdet && !tekstSoobshcheniya.trim() && prikreplennyeFayly.length === 0) && ui.sendDisabled, pressed && { transform: [{ scale: 0.98 }] }]}
              >{generatsiyaIdet ? <Square size={17} fill="#FFFFFF" color="#FFFFFF" /> : <ArrowUp size={23} color="#FFFFFF" strokeWidth={2.6} />}</Pressable>
            </View>
          </View>
          <View style={{ height: Platform.OS === 'android' ? 5 : 2 }} />
        </View>
      </KeyboardAvoidingView>
      {otobrazitIstoriyuChatov()}{otobrazitNastroyki()}{otobrazitVlozheniya()}{otobrazitDialogPereimenovaniya()}{otobrazitGolosoVvod()}
    </SafeAreaView>
  );
}


function sozdatStili(c: PalitraTsvetov) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    app: { flex: 1 },
    topBar: { height: 56, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    topBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    topBrandText: { color: c.tekst, fontSize: 18, fontWeight: '700', letterSpacing: -0.45 },
    chatTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
    topTitle: { maxWidth: '100%', color: c.tekst, fontSize: 17, fontWeight: '600' },
    conversationScroll: { flex: 1 },
    conversationContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22, gap: 14 },
    welcomeArea: { alignItems: 'center', width: '100%', paddingHorizontal: 4 },
    heroGlow: { width: 116, height: 116, marginBottom: 14, borderRadius: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft, shadowColor: '#7ED957', shadowOpacity: 0.2, shadowRadius: 23, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    heroTitle: { color: c.tekst, fontSize: 28, lineHeight: 35, fontWeight: '700', letterSpacing: -0.55 },
    heroSubtitle: { color: c.secondary, fontSize: 15, lineHeight: 22, marginTop: 4, textAlign: 'center' },
    quickPrompts: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 330 },
    promptChip: { height: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 7 },
    promptText: { color: c.tekst, fontSize: 13, fontWeight: '500' },
    messageGroup: { width: '100%', gap: 6 },
    userBubble: { maxWidth: '88%', backgroundColor: c.userBubble, borderRadius: 20, borderTopRightRadius: 7, paddingHorizontal: 14, paddingVertical: 12 },
    assistantCard: { maxWidth: '96%', width: '96%', backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 14, gap: 11 },
    assistantHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    assistantName: { color: c.tekst, fontSize: 13, fontWeight: '700' },
    tekstSoobshcheniya: { color: c.tekst, fontSize: 16, lineHeight: 24 },
    messageActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 3, gap: 1 },
    typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 26 },
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary },
    typingLabel: { marginLeft: 4, color: c.muted, fontSize: 13 },
    composerOuter: { backgroundColor: c.surface, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 3, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: c.border, shadowColor: '#3FAE3F', shadowOpacity: 0.1, shadowRadius: 17, shadowOffset: { width: 0, height: -4 }, elevation: 7 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    modePill: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
    modePillActive: { backgroundColor: '#B9F6B0', borderColor: '#B9F6B0' },
    modeText: { color: c.secondary, fontSize: 13, fontWeight: '500' },
    inputBox: { backgroundColor: c.alternate, borderRadius: 17, paddingHorizontal: 8, paddingTop: 7, paddingBottom: 4, minHeight: 105, maxHeight: 175 },
    messageInput: { minHeight: 44, maxHeight: 115, paddingHorizontal: 5, paddingVertical: 5, color: c.tekst, fontSize: 16, lineHeight: 23 },
    inputTools: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.strong, marginLeft: 3, shadowColor: '#3FAE3F', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
    sendDisabled: { backgroundColor: c.muted, shadowOpacity: 0 },
    attachmentChips: { gap: 7, paddingBottom: 8 },
    fileChip: { maxWidth: 210, height: 33, paddingHorizontal: 9, borderRadius: 17, backgroundColor: c.alternate, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
    fileChipText: { maxWidth: 145, color: c.tekst, fontSize: 12 },
    scrollDownButton: { position: 'absolute', right: 20, bottom: 168, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, elevation: 4 },
    toast: { position: 'absolute', bottom: 170, alignSelf: 'center', maxWidth: '90%', backgroundColor: '#203420', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 11, zIndex: 5 },
    tekstUvedomleniya: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
    modalBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(15,26,15,0.34)' },
    renameBackdrop: { flex: 1, backgroundColor: 'rgba(15,26,15,0.34)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    renameCard: { width: '100%', maxWidth: 360, borderRadius: 24, padding: 20, backgroundColor: c.surface, gap: 14 },
    renameInput: { minHeight: 48, borderRadius: 14, paddingHorizontal: 13, color: c.tekst, backgroundColor: c.alternate, borderWidth: 1, borderColor: c.border, fontSize: 16 },
    renameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 },
    renameCancel: { minHeight: 46, minWidth: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: c.alternate },
    renameCancelText: { color: c.secondary, fontSize: 14, fontWeight: '600' },
    renameSave: { minHeight: 46, minWidth: 108, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 12, backgroundColor: c.strong },
    renameSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    backdropTouch: { ...StyleSheet.absoluteFill },
    sidePanel: { width: '84%', maxWidth: 340, height: '100%', backgroundColor: c.surface, borderTopRightRadius: 24, borderBottomRightRadius: 24, paddingTop: Platform.OS === 'android' ? 38 : 54, paddingHorizontal: 17, paddingBottom: 18, overflow: 'visible' },
    panelBrand: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandText: { color: c.tekst, fontSize: 18, fontWeight: '700', letterSpacing: -0.35 },
    newChatButton: { height: 48, marginTop: 11, borderRadius: 16, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.strong },
    newChatText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    searchBox: { height: 44, paddingHorizontal: 12, marginTop: 14, borderRadius: 14, backgroundColor: c.alternate, flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: { flex: 1, color: c.tekst, fontSize: 14, paddingVertical: 0 },
    groupLabel: { marginTop: 19, marginBottom: 7, color: c.muted, fontSize: 12, fontWeight: '600' },
    chatHistoryRow: { minHeight: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 5, position: 'relative' },
    chatHistoryMain: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
    chatHistoryTitle: { flex: 1, color: c.tekst, fontSize: 14 },
    smallIconButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
    chatActionPopup: { position: 'absolute', right: 3, top: 42, zIndex: 10, minWidth: 176, backgroundColor: c.surface, borderRadius: 13, borderWidth: 1, borderColor: c.border, padding: 5, elevation: 7, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 10 },
    popupRow: { height: 41, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
    popupText: { color: c.tekst, fontSize: 13 },
    panelBottom: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
    bottomMenuRow: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 11 },
    bottomMenuText: { flex: 1, color: c.tekst, fontSize: 14 },
    aboutText: { color: c.muted, fontSize: 12, marginTop: 8 },
    emptyHistory: { alignItems: 'center', paddingTop: 46, gap: 8 },
    emptyTitle: { color: c.tekst, fontSize: 15, fontWeight: '600', marginTop: 5 },
    emptySub: { color: c.muted, fontSize: 13 },
    sheetPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'android' ? 26 : 38, minHeight: 340 },
    grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 3, backgroundColor: c.border, marginBottom: 7 },
    sheetHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetTitle: { color: c.tekst, fontSize: 20, fontWeight: '700' },
    sectionLabel: { color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 17, marginBottom: 6 },
    attachmentTiles: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 13 },
    attachmentTile: { flex: 1, height: 88, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.alternate, alignItems: 'center', justifyContent: 'center', gap: 8 },
    attachmentLabel: { color: c.tekst, fontSize: 13, fontWeight: '500' },
    recentEmpty: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
    recentEmptyText: { flex: 1, color: c.muted, fontSize: 13, lineHeight: 19 },
    settingsRow: { minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
    settingsRowText: { flex: 1, color: c.tekst, fontSize: 15 },
    settingsValue: { color: c.secondary, fontSize: 13 },
    aboutCard: { backgroundColor: c.alternate, borderRadius: 16, padding: 13, marginTop: 6 },
    aboutDescription: { color: c.secondary, fontSize: 13, lineHeight: 19, marginTop: 7 },
    voiceBackdrop: { flex: 1, backgroundColor: 'rgba(15,26,15,0.86)', justifyContent: 'center', padding: 20 },
    voiceCard: { borderRadius: 26, backgroundColor: c.surface, padding: 20, alignItems: 'center' },
    voiceOrb: { width: 120, height: 120, borderRadius: 60, marginTop: 5, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' },
    voiceTitle: { color: c.tekst, fontSize: 20, fontWeight: '700', marginTop: 18 },
    voiceTimer: { color: c.secondary, fontSize: 16, marginTop: 7, fontVariant: ['tabular-nums'] },
    waveform: { height: 52, marginTop: 17, flexDirection: 'row', alignItems: 'center', gap: 5 },
    waveBar: { width: 4, borderRadius: 3, backgroundColor: c.primary },
    voiceHint: { color: c.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16, maxWidth: 280 },
    voiceActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    voiceButton: { minWidth: 126, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    voiceButtonText: { color: c.tekst, fontSize: 14, fontWeight: '600' },
  });
}
