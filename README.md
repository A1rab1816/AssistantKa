# AssistentKa.ai — Android-проект

Первый рабочий каркас чата на **React Native + Expo SDK 57**. В проект уже включена сгенерированная нативная папка `android/` для открытия в Android Studio.

## Быстрый запуск

1. Установи Node.js из поддерживаемых Expo версий и Android Studio с Android SDK.
2. В корне проекта установи зависимости:

   ```bash
   npm install
   npx expo install --fix
   ```

3. Скопируй шаблон настроек и внеси свой OpenRouter-ключ локально:

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Открой `.env` и замени значение `OPENROUTER_API_KEY` на свой ключ. **Файл `.env` игнорируется Git.** Настоящий ключ не помещай в `.env.example`.

4. Запусти проект в Android-эмуляторе или на подключённом устройстве:

   ```bash
   npx expo run:android
   ```

   Чтобы открыть нативный Android-проект в Android Studio, сначала выполни эту команду либо `npx expo prebuild -p android`, затем открой папку `android/`.


