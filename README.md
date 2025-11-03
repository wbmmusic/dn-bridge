# DN Bridge

React + Electron + TypeScript desktop application for ArtNet protocol bridging and monitoring in professional lighting systems. This tool receives ArtNet DMX data on one network interface and forwards it to remote venues or different network segments while providing real-time universe monitoring.

## Build System

- **Electron Forge**: Modern build and packaging system
- **Vite**: Fast development server and optimized production builds
- **TypeScript**: Type-safe main process with full type checking

## Key Features

- **ArtNet Bridge**: Receives ArtNet data on port 6454 and forwards to configurable venue IP addresses for network bridging
- **Network Interface Selection**: Dynamic selection and configuration of network interfaces for ArtNet reception and transmission
- **Universe Monitoring**: Real-time monitoring and visualization of up to 10 DMX universes with 100ms update intervals
- **Dual Port Operation**: Listens on port 6454 (standard ArtNet) and sends on port 6455 for network bridging functionality
- **Configuration Management**: Persistent configuration storage for network interfaces and venue IP addresses
- **Child Process Architecture**: Forked artNet.js process for isolated UDP handling and reliable network operations
- **Auto-Recovery**: Automatic server restart when network interfaces change or become available for seamless operation
- **Cross-Platform**: macOS and Windows builds with code signing and notarization for professional deployment
- **Auto-Update**: Electron auto-updater with hourly update checks for maintaining current versions in production
- **Professional Interface**: Real-time universe data display with hexadecimal formatting designed for lighting technicians

## Architecture

Electron Forge + Vite application with React frontend, TypeScript main process, forked Node.js child process for ArtNet handling, and comprehensive network interface management designed for professional lighting network bridging.

## Development

```bash
pnpm install
pnpm start       # Start development server
pnpm make        # Build distributables
pnpm publish     # Publish to GitHub releases
```

## Professional Usage

Used in live events, installations, and venues for ArtNet network bridging between control networks and lighting equipment, enabling data distribution across network segments and remote venue control with network isolation.

## Dependencies

- React 19
- Electron 39
- TypeScript 5.6
- Vite 7
- Bootstrap 5
- Material-UI 7
- electron-updater 6
- Electron Forge 7

## Code Signing

- **Windows**: HSM token signing with SHA256 + RFC3161 timestamping
- **macOS**: Developer ID Application signing with notarization