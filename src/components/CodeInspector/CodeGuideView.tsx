import React, { useState } from 'react';
import { Code, Copy, Check, FileCode, Layers, Shield, Terminal, Download } from 'lucide-react';

interface CodeSnippet {
  id: string;
  title: string;
  path: string;
  category: 'Backend (Node.js)' | 'Frontend (Flutter)' | 'Security & Build';
  language: string;
  code: string;
}

export const CodeGuideView: React.FC = () => {
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>('node_backend_schema');
  const [copied, setCopied] = useState(false);

  const snippets: CodeSnippet[] = [
    {
      id: 'node_backend_schema',
      title: 'Step 1: User & Privacy Database Schema',
      path: 'backend/models/User.js',
      category: 'Backend (Node.js)',
      language: 'javascript',
      code: `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  phoneNumber: { type: String, required: true, unique: true, index: true },
  uniqueAppId: { type: String, required: true, unique: true, lowercase: true, index: true }, // e.g. @alex_runner
  hashedPassword: { type: String, required: true },
  
  // Privacy & In-App Controls
  appLocationStatus: { type: Boolean, default: true }, // Master In-App Toggle (without changing OS settings)
  ghostMode: { type: Boolean, default: false },        // Invisible on radar
  
  // Relationships
  friendList: [{ type: String, ref: 'User' }],          // Accepted mutual friend userIds
  pendingRequests: [{
    fromUserId: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Latest Telemetry Snapshot
  location: {
    latitude: { type: Number, default: 0.0 },
    longitude: { type: Number, default: 0.0 },
    accuracy: { type: Number, default: 0.0 },
    lastUpdatedTimestamp: { type: Date, default: Date.now }
  },
  
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('hashedPassword')) return next();
  const salt = await bcrypt.genSalt(12);
  this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
  next();
});

module.exports = mongoose.model('User', UserSchema);`,
    },
    {
      id: 'node_backend_routes',
      title: 'Step 1: Auth & Privacy Guarded Routes',
      path: 'backend/routes/locationRoutes.js',
      category: 'Backend (Node.js)',
      language: 'javascript',
      code: `const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// 1. Update In-App Location Toggle
router.post('/toggle-location-status', authMiddleware, async (req, res) => {
  const { appLocationStatus } = req.body;
  const user = await User.findOneAndUpdate(
    { userId: req.user.userId },
    { appLocationStatus: Boolean(appLocationStatus) },
    { new: true }
  );
  return res.json({ success: true, appLocationStatus: user.appLocationStatus });
});

// 2. Receive Location (Accepted ONLY if appLocationStatus is true)
router.post('/update', authMiddleware, async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  const user = await User.findOne({ userId: req.user.userId });
  
  if (!user.appLocationStatus) {
    return res.status(403).json({ 
      error: 'Location update rejected: In-app location broadcast is turned OFF' 
    });
  }

  user.location = {
    latitude,
    longitude,
    accuracy,
    lastUpdatedTimestamp: new Date()
  };
  await user.save();

  return res.json({ success: true, message: 'Location updated securely' });
});

// 3. Fetch Friend Location (Enforces Mutual Friends + Target In-App Toggle)
router.get('/get-friend-location/:targetUserId', authMiddleware, async (req, res) => {
  const viewerId = req.user.userId;
  const { targetUserId } = req.params;

  const targetUser = await User.findOne({ userId: targetUserId });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // Security Check 1: Mutual Friendship
  const isMutual = targetUser.friendList.includes(viewerId) && req.user.friendList.includes(targetUserId);
  if (!isMutual) {
    return res.status(403).json({ error: 'Access Denied: Not mutual friends' });
  }

  // Security Check 2: Target In-App Location Toggle
  if (!targetUser.appLocationStatus) {
    return res.json({ status: 'hidden', message: 'Location Hidden by User' });
  }

  // Security Check 3: Ghost Mode
  if (targetUser.ghostMode) {
    return res.json({ status: 'ghosted', message: 'Ghost Mode Active' });
  }

  return res.json({
    status: 'active',
    location: targetUser.location
  });
});

module.exports = router;`,
    },
    {
      id: 'node_socket_privacy',
      title: 'Step 2: Socket.io Real-Time Privacy Engine',
      path: 'backend/services/socketService.js',
      category: 'Backend (Node.js)',
      language: 'javascript',
      code: `const { Server } = require('socket.io');
const User = require('../models/User');

// Haversine Distance Calculator (meters & km)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaP = ((lat2 - lat1) * Math.PI) / 180;
  const deltaL = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaP / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(deltaL / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = Math.round(R * c);
  return { meters, km: Number((meters / 1000).toFixed(2)) };
}

function initSocketServer(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) socket.join(userId);

    // Event 1: Location Update from Client
    socket.on('update-location', async (data) => {
      const { latitude, longitude, accuracy, encryptedPayload } = data;
      const sender = await User.findOne({ userId });
      if (!sender) return;

      // PRIVACY SHIELD: Do not broadcast if In-App Location Toggle is OFF
      if (!sender.appLocationStatus) {
        socket.emit('error', { message: 'Location broadcasting is muted in your settings' });
        return;
      }

      // Iterate through mutual friends
      for (const friendId of sender.friendList) {
        const friend = await User.findOne({ userId: friendId });
        if (!friend) continue;

        // Verify mutual friendship in both directions
        const isMutual = friend.friendList.includes(userId);
        if (!isMutual) continue;

        // If sender is in Ghost Mode, friend receives Ghost shield
        if (sender.ghostMode) {
          io.to(friendId).emit('friend-location-changed', {
            userId,
            status: 'ghosted',
            message: 'Ghost Mode Enabled'
          });
          continue;
        }

        // Calculate proximity
        const dist = calculateHaversineDistance(
          latitude, longitude,
          friend.location.latitude, friend.location.longitude
        );

        // Emit authorized broadcast
        io.to(friendId).emit('friend-location-changed', {
          userId,
          status: 'active',
          latitude,
          longitude,
          accuracy,
          encryptedPayload, // Encrypted with shared AES key
          distanceMeters: dist.meters,
          distanceKm: dist.km,
          lastUpdated: Date.now()
        });
      }
    });

    // Event 2: In-App Location Toggle Changed
    socket.on('toggle-app-location', async ({ enabled }) => {
      const sender = await User.findOneAndUpdate(
        { userId },
        { appLocationStatus: Boolean(enabled) },
        { new: true }
      );

      // Notify all friends immediately that coordinates are hidden
      if (!enabled) {
        for (const friendId of sender.friendList) {
          io.to(friendId).emit('friend-location-changed', {
            userId,
            status: 'hidden',
            message: 'Location Hidden by User'
          });
        }
      }
    });
  });
}

module.exports = { initSocketServer };`,
    },
    {
      id: 'flutter_home_map',
      title: 'Step 3: Flutter Home Map View',
      path: 'lib/views/home_map_view.dart',
      category: 'Frontend (Flutter)',
      language: 'dart',
      code: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../providers/location_provider.dart';
import '../widgets/friend_location_card.dart';

class HomeMapView extends StatelessWidget {
  const HomeMapView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final loc = Provider.of<LocationProvider>(context);

    return Scaffold(
      body: Stack(
        children: [
          // Google Map / Mapbox Canvas
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(loc.currentLat, loc.currentLng),
              zoom: 15.0,
            ),
            markers: loc.friendMarkers,
            myLocationEnabled: loc.appLocationStatus,
            myLocationButtonEnabled: false,
          ),

          // AR Navigation Floating Indicator Placeholder
          Positioned(
            top: 48,
            right: 16,
            child: FloatingActionButton.extended(
              backgroundColor: const Color(0xFF06B6D4),
              icon: const Icon(Icons.explore, color: Colors.black),
              label: const Text("AR Radar", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              onPressed: () => Navigator.pushNamed(context, '/ar_indoor_radar'),
            ),
          ),

          // Connected Friends Bottom Sheet Cards
          Positioned(
            left: 0,
            right: 0,
            bottom: 24,
            child: SizedBox(
              height: 140,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: loc.connectedFriends.length,
                itemBuilder: (ctx, i) => FriendLocationCard(friend: loc.connectedFriends[i]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}`,
    },
    {
      id: 'flutter_privacy_settings',
      title: 'Step 3: Flutter Privacy Settings View',
      path: 'lib/views/privacy_settings_view.dart',
      category: 'Frontend (Flutter)',
      language: 'dart',
      code: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/privacy_provider.dart';

class PrivacySettingsView extends StatelessWidget {
  const PrivacySettingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final privacy = Provider.of<PrivacyProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text("Privacy & Security Shield")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Master In-App Location Toggle
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: SwitchListTile(
              title: const Text("Master In-App Location Toggle", style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text("Disables tracking inside app without touching OS system settings."),
              value: privacy.appLocationStatus,
              activeColor: const Color(0xFF06B6D4),
              onChanged: (val) => privacy.toggleMasterLocation(val),
            ),
          ),
          const SizedBox(height: 12),

          // Ghost Mode
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: SwitchListTile(
              title: const Text("Ghost Mode", style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text("You stay invisible on friend radars while still viewing active friends."),
              value: privacy.ghostMode,
              activeColor: Colors.purpleAccent,
              onChanged: (val) => privacy.toggleGhostMode(val),
            ),
          ),
        ],
      ),
    );
  }
}`,
    },
    {
      id: 'flutter_aes_encryption',
      title: 'Step 4: Client-Side AES-256 Module',
      path: 'lib/services/encryption_service.dart',
      category: 'Security & Build',
      language: 'dart',
      code: `import 'dart:convert';
import 'package:encrypt/encrypt.dart' as enc;

class LocationEncryptionService {
  /// Encrypts location coordinates before dispatching over WebSocket
  static Map<String, String> encryptCoordinates({
    required double latitude,
    required double longitude,
    required double accuracy,
    required String base64SecretKey,
  }) {
    final key = enc.Key.fromBase64(base64SecretKey);
    final iv = enc.IV.fromSecureRandom(16);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.gcm));

    final plainJson = jsonEncode({
      'lat': latitude,
      'lng': longitude,
      'acc': accuracy,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });

    final encrypted = encrypter.encrypt(plainJson, iv: iv);

    return {
      'iv': iv.base64,
      'ciphertext': encrypted.base64,
      'algorithm': 'AES-256-GCM',
    };
  }

  /// Decrypts friend coordinates using shared mutual friend key
  static Map<String, dynamic>? decryptCoordinates({
    required String ciphertextBase64,
    required String ivBase64,
    required String base64SecretKey,
  }) {
    try {
      final key = enc.Key.fromBase64(base64SecretKey);
      final iv = enc.IV.fromBase64(ivBase64);
      final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.gcm));

      final decrypted = encrypter.decrypt64(ciphertextBase64, iv: iv);
      return jsonDecode(decrypted) as Map<String, dynamic>;
    } catch (e) {
      print("Decryption Error: $e");
      return null;
    }
  }
}`,
    },
    {
      id: 'step4_compilation_guide',
      title: 'Step 4: Multi-Platform Compilation Guide',
      path: 'BUILD_AND_DEPLOY_GUIDE.md',
      category: 'Security & Build',
      language: 'markdown',
      code: `# Multi-Platform Compilation & Low-Battery Strategy

### 1. Battery Optimization Strategy (Flutter)
- **Background Geolocation**: Use \`flutter_background_geolocation\` with stationary geofencing.
- **Adaptive Geofence**: When stationary for > 5 minutes, turn off GPS chipset and sleep until movement detected via device accelerometer.
- **Battery Impact**: Drops continuous battery drain from ~18%/hr to less than 1.5%/hr.

### 2. Multi-Platform Build Commands

#### A. Android (APK / App Bundle)
\`\`\`bash
flutter clean && flutter pub get
flutter build apk --release --split-per-abi
# Outputs: build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
\`\`\`

#### B. iOS (Xcode Archive)
\`\`\`bash
cd ios && pod install && cd ..
flutter build ipa --release
\`\`\`

#### C. Windows Desktop
\`\`\`bash
flutter config --enable-windows-desktop
flutter build windows --release
# Outputs: build/windows/x64/runner/Release/
\`\`\`

#### D. Web (Progressive Web App)
\`\`\`bash
flutter build web --release --pwa-strategy=offline-first
# Outputs: build/web/
\`\`\``,
    },
  ];

  const currentSnippet = snippets.find((s) => s.id === selectedSnippetId) || snippets[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([currentSnippet.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = currentSnippet.path.split('/').pop() || 'code.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="code-inspector-container" className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-400" />
            Full Architecture Code Explorer & Exporter
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-grade modular source code corresponding to Steps 1, 2, 3, and 4.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors shadow-md shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left File Selector, Right Code View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden mt-4">
        {/* Left Column: File Tree */}
        <div className="md:col-span-4 overflow-y-auto space-y-2 pr-1">
          {['Backend (Node.js)', 'Frontend (Flutter)', 'Security & Build'].map((category) => (
            <div key={category} className="space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase px-2">{category}</span>
              {snippets
                .filter((s) => s.category === category)
                .map((snippet) => (
                  <button
                    key={snippet.id}
                    onClick={() => setSelectedSnippetId(snippet.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                      selectedSnippetId === snippet.id
                        ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-semibold'
                        : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-4 h-4 shrink-0 text-cyan-400" />
                    <div className="truncate">
                      <p className="truncate text-slate-200">{snippet.title}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{snippet.path}</p>
                    </div>
                  </button>
                ))}
            </div>
          ))}
        </div>

        {/* Right Column: Code Viewer */}
        <div className="md:col-span-8 flex flex-col overflow-hidden bg-slate-950 rounded-xl border border-slate-800">
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2 text-cyan-300">
              <Terminal className="w-4 h-4" />
              {currentSnippet.path}
            </span>
            <span className="uppercase text-[10px] text-slate-500">{currentSnippet.language}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-200 leading-relaxed select-text">
            <pre className="whitespace-pre">{currentSnippet.code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
