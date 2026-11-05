// .env не попадает в Git, но extra попадёт в сборку приложения.
// Поэтому этот вариант защищает ключ только от публикации в репозитории,
// а не от извлечения из APK. Для продакшена используйте сервер-посредник.
require('dotenv').config();

module.exports = {
  expo: {
    name: 'AssistentKa.ai',
    slug: 'assistentka-ai',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    android: {
      package: 'ai.assistentka.chat',
      adaptiveIcon: {
        backgroundColor: '#F4FFF4'
      }
    },
    plugins: [
      [
        'expo-image-picker',
        {
          photosPermission: 'Разрешите доступ к фото, чтобы прикреплять изображения к сообщению.',
          cameraPermission: 'Разрешите доступ к камере, чтобы сделать фото для сообщения.'
        }
      ],
      [
        'expo-document-picker',
        {
          iCloudContainerEnvironment: 'Development'
        }
      ]
    ],
    extra: {
      openRouterApiKey: process.env.OPENROUTER_API_KEY || ''
    }
  }
};
