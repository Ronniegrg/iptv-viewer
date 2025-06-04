# IPTV Viewer 📺

A modern, responsive IPTV viewer built with React and Vite. Stream live TV channels from M3U playlists with an intuitive interface and robust video controls.

🌐 **[Live Demo](https://ronniegrg.github.io/iptv-viewer/)**

## ✨ Features

- 📺 **M3U Playlist Support** - Load channels from M3U/M3U8 playlist files
- 🎥 **Advanced Video Player** - Built with react-player for reliable streaming
- 🎮 **Custom Controls** - Play/pause, volume, fullscreen, and progress controls
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔍 **Channel Search** - Quickly find channels with built-in search functionality
- 📋 **Channel List** - Organized channel listing with logos and metadata
- 🎯 **Error Handling** - Graceful error handling and loading states
- 🎨 **Modern UI** - Clean, modern interface with Lucide React icons

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Ronniegrg/iptv-viewer.git
cd iptv-viewer
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🛠️ Usage

1. **Load Playlist**: The app will prompt you to load an M3U playlist file
2. **Browse Channels**: Use the channel list to browse available channels
3. **Search**: Use the search bar to quickly find specific channels
4. **Watch**: Click on any channel to start streaming
5. **Controls**: Use the video player controls for playback management

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ChannelList.jsx  # Channel listing component
│   ├── VideoPlayer.jsx  # Main video player component
│   └── LoadingSpinner.jsx # Loading state component
├── hooks/              # Custom React hooks
│   ├── useVideoControls.js # Video control logic
│   └── useVideoPlayer.js   # Video player state management
├── utils/              # Utility functions
│   ├── m3uParser.js    # M3U playlist parser
│   └── streamUtils.js  # Stream handling utilities
└── App.jsx            # Main application component
```

## 🧰 Built With

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **react-player** - Video playback component
- **Axios** - HTTP client for playlist loading
- **Lucide React** - Modern icon library
- **ESLint** - Code linting and formatting

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

## 🚀 Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions. Every push to the `main` branch triggers a new deployment. The deployment workflow is defined in `.github/workflows/deploy.yml`.

**Live Application:** [https://ronniegrg.github.io/iptv-viewer/](https://ronniegrg.github.io/iptv-viewer/)

### Manual Deployment

If you want to deploy manually (for example, from your local machine), you can use the following command:

```bash
npm run deploy
```

This will build the project and publish the contents of the `dist` directory to the `gh-pages` branch, making your site available at the URL above.

> **Note:** Ensure your `vite.config.js` has the correct `base` set to `/iptv-viewer/` for GitHub Pages to work properly.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Known Issues

- Some streams may require CORS proxy for browser playback
- HLS streams work best with modern browsers

## 🚧 Roadmap

- [ ] Playlist management (save/load multiple playlists)
- [ ] Channel favorites
- [ ] Electronic Program Guide (EPG) support
- [ ] Picture-in-Picture mode
- [ ] Keyboard shortcuts
- [ ] Stream quality selection

## 📞 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/Ronniegrg/iptv-viewer/issues) on GitHub.
