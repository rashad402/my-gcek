# ETLab App

A cross-platform educational lab application built with React Native and Expo, providing a seamless learning experience across iOS, Android, and Web platforms.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **Multi-Platform Support**: Native iOS and Android apps, plus responsive web application
- **User Authentication**: Secure login system with Alexandria College integration
- **Assignment Management**: View and manage educational assignments
- **Attendance Tracking**: Real-time attendance dashboard and monitoring
- **Results Overview**: Comprehensive results and performance tracking
- **Surveys & Feedback**: In-app survey functionality for gathering feedback
- **Dark Mode Support**: Automatic light/dark theme based on system preferences
- **Responsive Design**: Optimized interface for all screen sizes
- **Custom Theme System**: Built-in design system with consistent branding

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev) - React Native framework
- **Runtime**: React 19.1.0, React Native 0.81.5
- **Language**: TypeScript
- **Routing**: [Expo Router](https://expo.dev/router) (file-based routing)
- **UI Libraries**: 
  - React Native Web (for web platform)
  - Expo UI (beta)
  - React Native Gesture Handler & Reanimated
- **Fonts**: Noto Serif & Inter (via Expo Google Fonts)
- **State Management**: Context API (LoginProvider)
- **Package Manager**: npm

## 📦 Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- For iOS development: macOS and Xcode
- For Android development: Android Studio and Android SDK
- Expo Account (optional, for managed builds) - [Sign up here](https://expo.dev)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LeetCode/GCEK
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install app dependencies**
   ```bash
   cd etlab-app
   npm install
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

## 🎯 Available Scripts

Run these commands from the `etlab-app` directory:

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run android` | Build and run on Android emulator |
| `npm run ios` | Build and run on iOS simulator |
| `npm run web` | Run on web browser |
| `npm run lint` | Run ESLint to check code quality |
| `npm run reset-project` | Reset project to clean state |

## 📁 Project Structure

```
etlab-app/
├── src/
│   ├── app/                 # Main application screens (file-based routing)
│   │   ├── _layout.tsx      # Root layout with theme and fonts
│   │   ├── index.tsx        # Home screen
│   │   ├── assignment.tsx   # Assignment screen
│   │   ├── explore.tsx      # Explore screen
│   │   ├── result.tsx       # Results screen
│   │   └── survey.tsx       # Survey screen
│   ├── components/          # Reusable React components
│   │   ├── app-tabs.tsx     # Tab navigation component
│   │   ├── login-screen.tsx # Authentication UI
│   │   ├── themed-*.tsx     # Themed components
│   │   └── ui/              # UI component library
│   ├── constants/           # App constants (theme, colors, etc.)
│   ├── hooks/               # Custom React hooks
│   └── global.css           # Global styles
├── assets/                  # Images, icons, and fonts
├── screens/                 # Web/design system screens
└── package.json
```

## 💻 Development

### Running the App

**Development Server:**
```bash
npm start
```

Then select your platform:
- **Android**: Press `a` in the terminal
- **iOS**: Press `i` in the terminal
- **Web**: Press `w` in the terminal
- **Expo Go**: Scan the QR code with your phone using the Expo Go app

### File-Based Routing

This project uses Expo Router's file-based routing system. Place new screens in `src/app/` and they'll automatically become routes:

```
src/app/
├── index.tsx          → /
├── assignment.tsx     → /assignment
└── [id].tsx          → /[id]
```

### TypeScript

The project is fully typed with TypeScript. Check types with:
```bash
npx tsc --noEmit
```

### Styling

The app uses a custom theme system located in `constants/theme.ts`. Customize colors and typography there for consistent branding.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes and test thoroughly
3. Commit with clear messages: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Guide](https://expo.dev/router)
- [TypeScript in Expo](https://docs.expo.dev/guides/typescript/)

## 🆘 Troubleshooting

**Issue: Dependencies not installing?**
- Clear cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`

**Issue: App not loading?**
- Clear Expo cache: `expo start -c`
- Reset the project: `npm run reset-project`

**Issue: Build errors on Android?**
- Update Android SDK tools in Android Studio
- Clear Android build cache: `rm -rf etlab-app/android/.gradle`

For more help, visit the [Expo Troubleshooting Guide](https://docs.expo.dev/troubleshooting/)

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
